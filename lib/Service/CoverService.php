<?php

declare(strict_types=1);

namespace OCA\Renamer\Service;

use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Files\IRootFolder;
use OCP\Files\Node;
use OCP\IUserSession;
use OCP\IDBConnection;
use Psr\Log\LoggerInterface;
use OCA\Renamer\Db\Cover;
use OCA\Renamer\Db\CoverMapper;
use OCA\Renamer\Preview\CbzPreviewProvider;

/**
 * Génération + cache transutilisateur des couvertures (covers) du Reader.
 *
 * Portabilité (règle #1 projet) : uniquement ZipArchive, GD, getID3 (vendor).
 * INTERDIT pdftoppm/pdfimages/ffmpeg/unrar. Un PDF n'est pas rendu côté serveur :
 * on cherche d'abord une image existante dans son dossier.
 */
class CoverService {
	/** Extensions image acceptées comme source de cover. */
	public const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

	/** Noms de couverture explicites, prioritaires, cherchés dans un dossier. */
	public const SIBLING_PRIORITY = [
		'cover.jpg', 'cover.jpeg', 'cover.png',
		'folder.jpg', 'folder.jpeg', 'folder.png',
	];

	private LoggerInterface $logger;
	private IRootFolder $rootFolder;
	private IUserSession $userSession;
	private IDBConnection $db;
	private MetadataService $metadataService;
	private CoverMapper $coverMapper;

	/** @var string Dossier local partagé où sont écrits les blobs JPEG (cross-user). */
	private string $coversDir;

	private int $width;

	/**
	 * @param string|null $coversDir Dossier local de stockage (injecté en test).
	 */
	public function __construct(
		LoggerInterface $logger,
		IRootFolder $rootFolder,
		IUserSession $userSession,
		IDBConnection $db,
		MetadataService $metadataService,
		CoverMapper $coverMapper,
		?string $coversDir = null,
		int $width = 300,
	) {
		$this->logger = $logger;
		$this->rootFolder = $rootFolder;
		$this->userSession = $userSession;
		$this->db = $db;
		$this->metadataService = $metadataService;
		$this->coverMapper = $coverMapper;
		$this->width = $width;
		$this->coversDir = $coversDir ?? $this->resolveCoversDir();
		$this->ensureCoversDir();
	}

	private function resolveCoversDir(): string {
		try {
			$appData = $this->rootFolder->get('appData');
			if ($appData instanceof Folder) {
				$renamer = $appData->has('renamer') ? $appData->get('renamer') : $appData->newFolder('renamer');
				if ($renamer instanceof Folder) {
					$covers = $renamer->has('covers') ? $renamer->get('covers') : $renamer->newFolder('covers');
					$path = method_exists($covers, 'toFilePath') ? $covers->toFilePath() : null;
					if (is_string($path) && is_dir($path)) {
						return $path;
					}
				}
			}
		} catch (\Throwable $e) {
			$this->logger->warning('CoverService appdata covers dir unavailable: ' . $e->getMessage(), ['app' => 'renamer']);
		}
		$rootPath = method_exists($this->rootFolder, 'toFilePath') ? $this->rootFolder->toFilePath() : null;
		if (is_string($rootPath) && is_dir($rootPath)) {
			$fallback = $rootPath . '/renamer-covers';
			@mkdir($fallback, 0770, true);
			if (is_dir($fallback)) {
				return $fallback;
			}
		}
		$fallback = sys_get_temp_dir() . '/renamer-covers';
		@mkdir($fallback, 0770, true);
		return $fallback;
	}

	private function ensureCoversDir(): void {
		if (!is_dir($this->coversDir)) {
			@mkdir($this->coversDir, 0770, true);
		}
	}

	/** Hash stable partagé entre tous les utilisateurs (Décision #1). */
	public static function computeHash(string $path, int $mtime, int $size): string {
		return sha1(ltrim($path, '/') . '|' . $mtime . '|' . $size);
	}

	/**
	 * @param string[] $paths
	 * @return array{success:bool, covers:array<string,string|null>, missing:array<int,string>}
	 */
	public function getCovers(array $paths, ?int $width = null): array {
		$covers = [];
		$missing = [];
		foreach ($paths as $i => $path) {
			$url = $this->getCover((string) $path, $width);
			if ($url === null) {
				$covers[(string) $path] = null;
				$missing[$i] = (string) $path;
			} else {
				$covers[(string) $path] = $url;
			}
		}
		return ['success' => true, 'covers' => $covers, 'missing' => array_values($missing)];
	}

	/**
	 * URL du cover pour un tome, ou null si aucun cover générable (le frontend
	 * conserve l'emoji). Génération on-demand, mise en cache.
	 */
	public function getCover(string $path, ?int $width = null): ?string {
		$width = $width ?? $this->width;
		$resolved = $this->resolveSourceLocalPath($path);
		if ($resolved === null) {
			return null;
		}
		['path' => $localPath, 'mtime' => $mtime, 'size' => $size] = $resolved;
		$ext = $resolved['ext'];
		$hash = self::computeHash($path, $mtime, $size);

		$row = $this->coverMapper->findByHash($hash);
		if ($row !== null && $this->blobExists($row->getCoverPath())) {
			// Cache validé — on sert directement (cross-user OK, Décision #9).
			return $this->urlForHash($hash);
		}

		$blob = $this->generateFromSource($localPath, $ext, $path, $width);
		if ($blob === null) {
			return null;
		}
		$blobPath = $this->coversDir . '/' . $hash . '.jpg';
		if (!file_put_contents($blobPath, $blob) || !is_file($blobPath)) {
			return null;
		}
		$cover = new Cover();
		$cover->setHash($hash);
		$cover->setSourcePath(ltrim($path, '/'));
		$cover->setSourceMtime($mtime);
		$cover->setSourceSize($size);
		$cover->setCoverPath($blobPath);
		try {
			$this->coverMapper->save($cover);
		} catch (\Throwable $e) {
			$this->logger->warning('CoverService: could not persist cover row for ' . $path . ': ' . $e->getMessage(), ['app' => 'renamer']);
		}
		return $this->urlForHash($hash);
	}

	/** Cover agrégé d'une collection/bibliothèque : premier tome qui a un cover. */
	public function getAggregateCover(array $tomePaths, ?int $width = null): ?string {
		foreach ($tomePaths as $path) {
			$url = $this->getCover((string) $path, $width);
			if ($url !== null) {
				return $url;
			}
		}
		return null;
	}

	public function urlForHash(string $hash): string {
		return '/api/covers/blob/' . rawurlencode($hash);
	}

	/** Retourne le chemin absolu du blob cover (à streamer), ou null. */
	public function coverBlobPath(string $hash): ?string {
		$row = $this->coverMapper->findByHash($hash);
		$path = $row !== null ? $row->getCoverPath() : null;
		if ($path !== null && $this->blobExists($path)) {
			return $path;
		}
		return null;
	}

	/**
	 * @return array{path:string, mtime:int, size:int, ext:string}|null
	 */
	private function resolveSourceLocalPath(string $path): ?array {
		$user = $this->userSession->getUser();
		if ($user === null) {
			return null;
		}
		$uid = $user->getUID();
		$cleanPath = ltrim((string) $path, '/');
		if ($cleanPath === '') {
			return null;
		}
		try {
			$userFolder = $this->rootFolder->getUserFolder($uid);
			$node = $userFolder->get($cleanPath);
		} catch (\Throwable $e) {
			return null;
		}
		if (!$node instanceof File || !$node->isReadable()) {
			return null;
		}
		$localPath = '';
		try {
			$storage = $node->getStorage();
			$resolved = $storage->getLocalFile($node->getInternalPath());
			if ($resolved !== false) {
				$localPath = (string) $resolved;
			}
		} catch (\Throwable $e) {
			return null;
		}
		if (!$localPath || !is_file($localPath)) {
			return null;
		}
		$ext = strtolower((string) pathinfo($node->getName(), PATHINFO_EXTENSION));
		return [
			'path'  => $localPath,
			'mtime' => (int) $node->getMTime(),
			'size'  => (int) $node->getSize(),
			'ext'   => $ext,
		];
	}

	/** Génère le blob JPEG (ou null) depuis un fichier local déjà résolu. */
	private function generateFromSource(string $localPath, string $ext, string $sourcePath, int $width): ?string {
		$blob = null;
		switch ($ext) {
			case 'cbz':
			case 'cbr':
			case 'zip':
				$blob = $this->makeCbzCover($localPath, $width);
				break;
			case 'epub':
				$blob = $this->makeEpubCover($localPath, $width);
				break;
			case 'jpg':
			case 'jpeg':
			case 'png':
			case 'gif':
			case 'webp':
			case 'bmp':
				$blob = $this->makeImageCover($localPath, $width);
				break;
			case 'pdf':
			default:
				// PDF & types inconnus : image frère dans le dossier (portable).
				$blob = $this->makeSiblingCover($sourcePath, $width);
				break;
			case 'mp3':
			case 'flac':
			case 'ogg':
			case 'opus':
			case 'wav':
			case 'm4a':
				$blob = $this->makeAudioCover($sourcePath, $width);
				break;
		}
		return $blob;
	}

	/** Cover CBZ/CBR via ZipArchive, réutilise la sélection déterministe du provider. */
	private function makeCbzCover(string $localPath, int $width): ?string {
		if (!class_exists('\ZipArchive')) {
			return null;
		}
		$zip = new \ZipArchive();
		$ok = @$zip->open($localPath);
		if ($ok !== true) {
			return null;
		}
		try {
			$idx = CbzPreviewProvider::selectCoverEntry($zip);
			if ($idx === null) {
				return null;
			}
			$stat = $zip->statIndex($idx);
			if ($stat === false) {
				return null;
			}
			$bytes = $zip->getFromIndex($idx);
			if (!is_string($bytes) || $bytes === '') {
				return null;
			}
			return $this->normalizeToJpeg($bytes, $width);
		} finally {
			$zip->close();
		}
	}

	/** Cover EPUB : parse le .opf, sinon 1ère image du zip. */
	private function makeEpubCover(string $localPath, int $width): ?string {
		if (!class_exists('\ZipArchive')) {
			return null;
		}
		$zip = new \ZipArchive();
		$ok = @$zip->open($localPath);
		if ($ok !== true) {
			return null;
		}
		try {
			$opfPath = null;
			$entries = [];
			for ($i = 0; $i < $zip->numFiles; $i++) {
				$name = $zip->getNameIndex($i);
				if ($name === false) {
					continue;
				}
				$entries[] = $name;
				if (preg_match('/\.opf$/', $name)) {
					$opfPath = $name;
				}
			}
			$imageBytes = null;
			if ($opfPath !== null) {
				$opf = $zip->getFromName($opfPath);
				$imageBytes = $this->extractEpubCoverFromOpf($opf, $zip, $opfPath);
			}
			if ($imageBytes === null) {
				$picked = self::selectSiblingCover(array_map('strtolower', $entries));
				if ($picked !== null) {
					$imageBytes = $zip->getFromName($picked);
				}
			}
			if (is_string($imageBytes) && $imageBytes !== '') {
				return $this->normalizeToJpeg($imageBytes, $width);
			}
			return null;
		} finally {
			$zip->close();
		}
	}

	/** @return string|null bytes RAW de l'image de couverture depuis le .opf. */
	private function extractEpubCoverFromOpf(?string $opfXml, \ZipArchive $zip, ?string $opfPath): ?string {
		if ($opfXml === null || $opfXml === '') {
			return null;
		}
		libxml_use_internal_errors(true);
		$doc = simplexml_load_string($opfXml);
		if ($doc === false) {
			libxml_clear_errors();
			return null;
		}
		libxml_clear_errors();

		$namespaces = $doc->getNamespaces(true);
		$ns = (string) ($namespaces[''] ?? 'http://www.idpf.org/2007/opf');
		$doc->registerXPathNamespace('opf', $ns);

		$coverId = null;
		$covr = $doc->xpath('//opf:meta[@property="covr"] | //meta[@property="covr"]');
		foreach ($covr as $m) {
			$coverId = (string) ($m['content']);
			break;
		}
		if ($coverId === '' || $coverId === '0') {
			$cov2 = $doc->xpath('//opf:meta[@name="cover"] | //meta[@name="cover"]');
			foreach ($cov2 as $m) {
				$coverId = (string) ($m['content']);
				break;
			}
		}

		// Cartographie manifest item id -> href.
		$items = $doc->xpath('//opf:manifest/opf:item | //manifest/item');
		$manifest = [];
		foreach ($items as $item) {
			$id = (string) ($item['id']);
			$href = (string) ($item['href']);
			if ($id !== '' && $href !== '') {
				$manifest[$id] = $href;
			}
		}

		$href = null;
		if ($coverId !== '' && isset($manifest[$coverId])) {
			$href = $manifest[$coverId];
		}
		if ($href === null) {
			foreach ($doc->xpath('//opf:metadata/opf:link[@rel="coverImage"] | //metadata/link[@rel="coverImage"]') as $l) {
				$href = (string) ($l['href']);
				if ($href !== '') {
					break;
				}
			}
		}
		if ($href === null) {
			return null;
		}

		// Résoudre href relatif au .opf.
		$opfDir = ($opfPath !== null && $opfPath !== '') ? (string) dirname($opfPath) : '';
		if ($opfDir === '.') {
			$opfDir = '';
		}
		$candidates = [
			$href,
			($opfDir !== '' ? $opfDir . '/' . ltrim($href, '/') : $href),
		];
		foreach ($candidates as $c) {
			$bytes = $zip->getFromName($c);
			if (is_string($bytes) && $bytes !== '') {
				return $bytes;
			}
		}
		// Dernier recours : correspondance par basename d'image.
		$wantBase = strtolower(basename($href));
		for ($i = 0; $i < $zip->numFiles; $i++) {
			$name = $zip->getNameIndex($i);
			if ($name === false) {
				continue;
			}
			if (strtolower(basename($name)) === $wantBase && preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $name)) {
				$bytes = $zip->getFromName($name);
				if (is_string($bytes) && $bytes !== '') {
					return $bytes;
				}
			}
		}
		return null;
	}

	/** Cover image directe via GD. */
	private function makeImageCover(string $localPath, int $width): ?string {
		$bytes = @file_get_contents($localPath);
		if ($bytes === false) {
			return null;
		}
		return $this->normalizeToJpeg($bytes, $width);
	}

	/** Cover audio via art intégré getID3 (portable). */
	private function makeAudioCover(string $sourcePath, int $width): ?string {
		$bytes = $this->metadataService->getEmbeddedCover($sourcePath);
		if ($bytes === null) {
			return null;
		}
		return $this->normalizeToJpeg($bytes, $width);
	}

	/** Image existante dans le dossier frère (PDF & fallback). */
	private function makeSiblingCover(string $sourcePath, int $width): ?string {
		$names = $this->siblingNames($sourcePath);
		if (empty($names)) {
			return null;
		}
		$picked = self::selectSiblingCover($names);
		if ($picked === null) {
			return null;
		}
		$local = $this->siblingLocalPath($sourcePath, $picked);
		if ($local === null || !is_file($local)) {
			return null;
		}
		$bytes = @file_get_contents($local);
		if ($bytes === false) {
			return null;
		}
		return $this->normalizeToJpeg($bytes, $width);
	}

	/** @return string[] basenames (lower-cased) des frères images du dossier. */
	private function siblingNames(string $sourcePath): array {
		$folder = $this->resolveSiblingFolder($sourcePath);
		if ($folder === null) {
			return [];
		}
		$names = [];
		try {
			foreach ($folder->getDirectoryListing() as $child) {
				if ($child instanceof Folder) {
					continue;
				}
				$ext = strtolower((string) pathinfo($child->getName(), PATHINFO_EXTENSION));
				if (in_array($ext, self::IMAGE_EXTENSIONS, true)) {
					$names[] = strtolower($child->getName());
				}
			}
		} catch (\Throwable $e) {
			return $names;
		}
		return $names;
	}

	private function resolveSiblingFolder(string $sourcePath): ?Folder {
		$user = $this->userSession->getUser();
		if ($user === null) {
			return null;
		}
		$uid = $user->getUID();
		$cleanPath = ltrim((string) $sourcePath, '/');
		$dir = (string) dirname($cleanPath);
		if ($dir === '.' || $dir === '') {
			return null;
		}
		try {
			$userFolder = $this->rootFolder->getUserFolder($uid);
			$folder = $userFolder->get($dir);
		} catch (\Throwable $e) {
			return null;
		}
		return ($folder instanceof Folder && $folder->isReadable()) ? $folder : null;
	}

	private function siblingLocalPath(string $sourcePath, string $basename): ?string {
		$folder = $this->resolveSiblingFolder($sourcePath);
		if ($folder === null) {
			return null;
		}
		try {
			$node = $folder->get($basename);
			if (!($node instanceof File)) {
				return null;
			}
			$storage = $node->getStorage();
			$local = $storage->getLocalFile($node->getInternalPath());
			return $local !== false ? (string) $local : null;
		} catch (\Throwable $e) {
			return null;
		}
	}

	private function blobExists(string $path): bool {
		return is_file($path) && is_readable($path);
	}

	/**
	 * Normalise n'importe quelle image (bytes) en JPEG, redimensionnée à $width px
	 * (hauteur proportionnelle). GD uniquement → portable.
	 *
	 * @return string|null bytes JPEG bruts, ou null si GD absent / image invalide.
	 */
	public static function normalizeToJpeg(string $bytes, int $width): ?string {
		if (!function_exists('imagecreatefromstring')) {
			return null;
		}
		$src = @imagecreatefromstring($bytes);
		if (!is_resource($src) && !$src instanceof \GdImage) {
			return null;
		}
		$sw = imagesx($src);
		$sh = imagesy($src);
		if ($sw <= 0 || $sh <= 0) {
			if (is_resource($src)) {
				imagedestroy($src);
			} elseif ($src instanceof \GdImage) {
				imagedestroy($src);
			}
			return null;
		}
		$ratio = $width / $sw;
		$dstW = $width;
		$dstH = max(1, (int) round($sh * $ratio));
		$dst = imagecreatetruecolor($dstW, $dstH);
		if (!is_resource($dst) && !$dst instanceof \GdImage) {
			if (is_resource($src)) {
				imagedestroy($src);
			} elseif ($src instanceof \GdImage) {
				imagedestroy($src);
			}
			return null;
		}
		// Fond blanc pour les PNG transparents.
		$white = imagecolorallocate($dst, 255, 255, 255);
		imagefilledrectangle($dst, 0, 0, $dstW, $dstH, $white);
		imagecopyresampled($dst, $src, 0, 0, 0, 0, $dstW, $dstH, $sw, $sh);
		$out = '';
		$ok = ob_start();
		if ($ok === false) {
			if (is_resource($src)) {
				imagedestroy($src);
			} elseif ($src instanceof \GdImage) {
				imagedestroy($src);
			}
			if (is_resource($dst)) {
				imagedestroy($dst);
			} elseif ($dst instanceof \GdImage) {
				imagedestroy($dst);
			}
			return null;
		}
		imagejpeg($dst, null, 80);
		$out = ob_get_clean();
		if (is_resource($src)) {
			imagedestroy($src);
		} elseif ($src instanceof \GdImage) {
			imagedestroy($src);
		}
		if (is_resource($dst)) {
			imagedestroy($dst);
		} elseif ($dst instanceof \GdImage) {
			imagedestroy($dst);
		}
		return ($out !== false && $out !== '') ? $out : null;
	}

	/**
	 * Choisit le nom d'image à utiliser dans un dossier, par priorité :
	 * cover.jpg/png → folder.jpg/png → 1ère image.
	 *
	 * @param string[] $namesLower basenames lower-cased
	 */
	public static function selectSiblingCover(array $namesLower): ?string {
		if (empty($namesLower)) {
			return null;
		}
		$set = array_flip($namesLower);
		foreach (self::SIBLING_PRIORITY as $p) {
			if (isset($set[$p])) {
				return $p;
			}
		}
		foreach ($namesLower as $n) {
			if (preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $n)) {
				return $n;
			}
		}
		return null;
	}
}
