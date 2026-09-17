<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\Renamer\Preview;

use OCP\Files\File;
use OCP\Files\FileInfo;
use OCP\IImage;
use OCP\Image;
use Psr\Log\LoggerInterface;

/**
 * Preview provider that exposes the cover image embedded in a CBZ (comic book
 * ZIP archive) through the native Nextcloud preview system.
 *
 * The CBZ file is the single source of truth: it is never modified and no
 * cover.jpg is written next to it. Nextcloud owns the preview cache.
 *
 * Responsibilities:
 *   1. Open the archive read-only (PHP ZipArchive).
 *   2. Deterministically pick the cover entry (cover.jpg > folder.jpg >
 *      first numbered image > first valid image, case-insensitive).
 *   3. Load only that single entry into an OCP\Image and let Nextcloud scale +
 *      cache it.
 */
class CbzPreviewProvider extends ProviderV2 {
	/**
	 * Hard ceiling on the uncompressed size of the cover entry we are willing
	 * to decompress into memory. Protects against zip-bomb style archives.
	 */
	public const MAX_COVER_BYTES = 104_857_600; // 100 MB

	/** MIME type regex matching the Nextcloud mime type of a .cbz file. */
	public const MIME_TYPE_REGEX = '/^application\/comicbook\+zip$/';

	/** Image extensions (lower-cased, without dot) accepted as cover sources. */
	public const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

	/** Ordered list of cover/folder basenames searched (case-insensitive). */
	public const COVER_PRIORITY = [
		'cover.jpg',
		'cover.jpeg',
		'cover.png',
		'folder.jpg',
		'folder.jpeg',
		'folder.png',
	];

	public function __construct(
		private LoggerInterface $logger,
	) {
		parent::__construct();
	}

	/**
	 * {@inheritDoc}
	 */
	public function getMimeType(): string {
		return self::MIME_TYPE_REGEX;
	}

	/**
	 * @inheritDoc
	 */
	public function isAvailable(FileInfo $file): bool {
		$ext = strtolower((string)pathinfo($file->getInternalPath(), PATHINFO_EXTENSION));
		if ($ext === 'cbz') {
			return true;
		}
		// Some setups may sniff a .cbz as a plain zip; only accept zip-shaped
		// mime types from a real cbz extension to avoid mis-picks.
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function getThumbnail(File $file, int $maxX, int $maxY): ?IImage {
		$localFile = $this->getLocalFile($file);
		if ($localFile === false) {
			$this->logger->warning('Could not resolve a local file to generate CBZ thumbnail for {file}.', [
				'app' => 'renamer',
				'file' => $file->getInternalPath(),
			]);
			return null;
		}

		try {
			return $this->extractCoverImage($localFile, $maxX, $maxY);
		} catch (\Throwable $e) {
			$this->logger->warning('Failed to generate thumbnail for CBZ file {file}: {error}', [
				'app' => 'renamer',
				'file' => $file->getInternalPath(),
				'error' => $e->getMessage(),
			]);
			return null;
		} finally {
			$this->cleanTmpFiles();
		}
	}

	/**
	 * Pick the cover entry index from an archive.
	 *
	 * Returns the 0-based ZipArchive index of the chosen entry, or null when
	 * the archive holds no usable image entry or only malicious paths.
	 *
	 * This is deterministic and pure (operates only on the ZipArchive) so it can
	 * be unit-tested without booting the Nextcloud server.
	 */
		public static function selectCoverEntry(\ZipArchive $zip): ?int {
		$numFiles = $zip->numFiles;
		if ($numFiles <= 0) {
			return null;
		}

		$firstImageIndex = null;
		$numbered = [];
		$priorityMatches = [];

		for ($i = 0; $i < $numFiles; $i++) {
			$stat = $zip->statIndex($i);
			if ($stat === false || empty($stat['name'])) {
				continue;
			}

			$name = (string)$stat['name'];
			$lower = strtolower($name);

			// Security: reject path-traversal / absolute / backslash-traversal entries.
			if ($lower[0] === '/' || strpos($lower, '\\') !== false || strpos($lower, '..') !== false) {
				continue;
			}

			$slashPos = strrpos($name, '/');
			$basename = $slashPos === false ? $name : substr($name, $slashPos + 1);
			$lowerBase = strtolower($basename);
			$dotPos = strrpos($lowerBase, '.');
			if ($dotPos === false) {
				continue;
			}

			$ext = substr($lowerBase, $dotPos + 1);
			if (!in_array($ext, self::IMAGE_EXTENSIONS, true)) {
				continue;
			}

			// Rules 1-6: explicit cover/folder names (case-insensitive), first occurrence wins.
			if (isset($priorityMatches[$lowerBase])) {
				// already seen; keep the first occurrence
			} elseif (in_array($lowerBase, self::COVER_PRIORITY, true)) {
				$priorityMatches[$lowerBase] = $i;
			}

			// Rule 7: numbered images, e.g. 001.jpg / 01.jpg / 1.jpg
			$nameNoExt = substr($lowerBase, 0, $dotPos);
			if ($nameNoExt !== '' && ctype_digit($nameNoExt)) {
				$numVal = (int)$nameNoExt;
				if (!array_key_exists($numVal, $numbered)) {
					$numbered[$numVal] = $i;
				}
				continue;
			}

			// Rule 8: first valid (non-numbered) image in archive order
			if ($firstImageIndex === null) {
				$firstImageIndex = $i;
			}
		}

		// Rules 1-6: explicit cover/folder names, in declared order, first match wins.
		foreach (self::COVER_PRIORITY as $coverName) {
			if (isset($priorityMatches[$coverName])) {
				return $priorityMatches[$coverName];
			}
		}

		// Rule 7: smallest numbered image value
		if (!empty($numbered)) {
			$keys = array_keys($numbered);
			sort($keys, SORT_NUMERIC);
			return $numbered[$keys[0]];
		}

		// Rule 8: first valid image in archive order
		return $firstImageIndex;
	}

	/**
	 * Open the CBZ at $path, select its cover and return it as an OCP\Image
	 * scaled down to fit within ($maxX, $maxY). Returns null when no usable
	 * cover exists or the archive is invalid/corrupted.
	 */
	private function extractCoverImage(string $cbzPath, int $maxX, int $maxY): ?IImage {
		$zip = new \ZipArchive();

		$result = $zip->open($cbzPath);
		if ($result !== true && $result !== \ZipArchive::ER_OK) {
			$this->logger->debug('CBZ preview: could not open archive {file} (code {code}).', [
				'app' => 'renamer',
				'file' => $cbzPath,
				'code' => $result,
			]);
			return null;
		}

		try {
			$index = self::selectCoverEntry($zip);
			if ($index === null) {
				return null;
			}

			$stat = $zip->statIndex($index);
			if ($stat === false) {
				return null;
			}

			// Zip-bomb protection: never decompress an oversized entry.
			if ((int)($stat['size'] ?? 0) > self::MAX_COVER_BYTES) {
				$this->logger->info('CBZ preview: cover entry too large ({size} bytes) for {file}, aborting.', [
					'app' => 'renamer',
					'file' => $cbzPath,
					'size' => $stat['size'],
				]);
				return null;
			}

			$data = $zip->getFromIndex($index);
			if ($data === false) {
				return null;
			}

			$image = new Image();
			$image->loadFromData($data);
			if (!$image->valid()) {
				return null;
			}
			$image->fixOrientation();
			$image->scaleDownToFit($maxX, $maxY);
			return $image;
		} catch (\Throwable $e) {
			$this->logger->warning('CBZ preview error for {file}: {error}', [
				'app' => 'renamer',
				'file' => $cbzPath,
				'error' => $e->getMessage(),
			]);
			return null;
		} finally {
			$zip->close();
		}
	}
}
