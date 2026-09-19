<?php

namespace OCA\Renamer\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\AppFramework\Http\StreamResponse;
use OCP\AppFramework\Http\Response;
use OCP\IRequest;
use OCP\AppFramework\Annotation\AdminRequired;
use OCP\AppFramework\Annotation\NoCSRFRequired;
use Psr\Log\LoggerInterface;
use OCA\Renamer\Service\RuleService;
use OCA\Renamer\Service\RenameService;
use OCA\Renamer\Service\PreviewService;
use OCA\Renamer\Service\MetadataService;
use OCA\Renamer\Service\Pdf\PdfService;
use OCA\Renamer\Db\LibraryMapper;
use OCA\Renamer\Db\CollectionMapper;
use OCA\Renamer\Db\ReadingProgressMapper;
use OCA\Renamer\Service\CoverService;
use OCA\Renamer\Http\EpubTemplateResponse;
use OCA\Renamer\Security\ReaderContentSecurityPolicy;
use OCP\IUserSession;
use OCP\Files\IRootFolder;
use OCP\Files\File;
use OCP\Files\FileInfo;
use OCP\ITagManager;
use OCP\IGroupManager;

class PageController extends Controller {
    private LoggerInterface $logger;
    private RuleService $ruleService;
    private RenameService $renameService;
    private PreviewService $previewService;
    private MetadataService $metadataService;
    private PdfService $pdfService;
    private IUserSession $userSession;
    private IRootFolder $rootFolder;
    private LibraryMapper $libraryMapper;
    private CollectionMapper $collectionMapper;
    private ITagManager $tagManager;
    private IGroupManager $groupManager;
    private CoverService $coverService;

    public function __construct(string $appName, IRequest $request, LoggerInterface $logger, RuleService $ruleService, RenameService $renameService, PreviewService $previewService, MetadataService $metadataService, PdfService $pdfService, IUserSession $userSession, IRootFolder $rootFolder, LibraryMapper $libraryMapper, CollectionMapper $collectionMapper, ITagManager $tagManager, IGroupManager $groupManager, CoverService $coverService) {
        parent::__construct($appName, $request);
        $this->logger = $logger;
        $this->ruleService = $ruleService;
        $this->renameService = $renameService;
        $this->previewService = $previewService;
        $this->metadataService = $metadataService;
        $this->pdfService = $pdfService;
        $this->userSession = $userSession;
        $this->rootFolder = $rootFolder;
        $this->libraryMapper = $libraryMapper;
        $this->collectionMapper = $collectionMapper;
        $this->tagManager = $tagManager;
        $this->groupManager = $groupManager;
        $this->coverService = $coverService;
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function index(): TemplateResponse {
        $this->logger->debug('index() called', ['app' => 'renamer']);
        return $this->renderRenamerPage();
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function readerPage(): TemplateResponse {
        return $this->renderLibraryPage();
    }

    private function renderRenamerPage(): TemplateResponse {
        $this->logger->debug('renderRenamerPage() rendering renamer app page mode (4 tabs)', ['app' => 'renamer']);
        // Standalone renamer app page: loads ALL tab scripts (advanced inline in app.js,
        // plus pdf, metadata, reader tabs) and viewer libraries so the full tab system
        // is available at /apps/renamer.
        // The /apps/renamer/reader route is the standalone reader/library page handled separately.
         \OCP\Util::addScript('renamer', 'log');
         \OCP\Util::addScript('renamer', 'dev-refresh-components');
         \OCP\Util::addScript('renamer', 'utils');
         \OCP\Util::addScript('renamer', 'Sortable.min');
         \OCP\Util::addScript('renamer', 'icons');
         \OCP\Util::addScript('renamer', 'app');
         \OCP\Util::addScript('renamer', 'navigation');
         \OCP\Util::addScript('renamer', 'app-pdf');
         \OCP\Util::addScript('renamer', 'app-metadata');
         \OCP\Util::addScript('renamer', 'rename');
         \OCP\Util::addScript('renamer', 'pdf.min');
         \OCP\Util::addScript('renamer', 'jszip.min');
         \OCP\Util::addScript('renamer', 'pdf.worker.min');
         \OCP\Util::addScript('renamer', 'epub.min');
         \OCP\Util::addScript('renamer', 'tabs/pdf/reader');
         \OCP\Util::addScript('renamer', 'tabs/pdf/generic-viewer');
         \OCP\Util::addScript('renamer', 'tabs/reader/app-reader');
         \OCP\Util::addStyle('renamer', 'style');
         $response = new EpubTemplateResponse('renamer', 'renamer', ['standalonePage' => true]);
        $csp = new ReaderContentSecurityPolicy();
        $csp->addAllowedStyleDomain('blob:');
        $csp->addAllowedStyleDomain('data:');
        $csp->addAllowedFontDomain('blob:');
        $csp->addAllowedFrameDomain("'self'");
        $csp->addAllowedFrameDomain('blob:');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }

    private function renderLibraryPage(): TemplateResponse {
        $this->logger->debug('renderLibraryPage() rendering standalone reader/library page', ['app' => 'renamer']);
        // Standalone reader library page: loads ONLY the library UI + document viewers.
        // No renamer tab system (app.js / tabs) — this page is standalone.
        // Accessible at /apps/renamer/reader (handled by another agent).
         \OCP\Util::addScript('renamer', 'log');
         \OCP\Util::addScript('renamer', 'dev-refresh-components');
         \OCP\Util::addScript('renamer', 'utils');
         \OCP\Util::addScript('renamer', 'icons');
         \OCP\Util::addScript('renamer', 'navigation');
         \OCP\Util::addScript('renamer', 'library');
        \OCP\Util::addScript('renamer', 'pdf.min');
        \OCP\Util::addScript('renamer', 'jszip.min');
        \OCP\Util::addScript('renamer', 'pdf.worker.min');
        \OCP\Util::addScript('renamer', 'epub.min');
        \OCP\Util::addScript('renamer', 'tabs/pdf/reader');
        \OCP\Util::addScript('renamer', 'tabs/pdf/generic-viewer');
        \OCP\Util::addStyle('renamer', 'style');
        $isAdmin = false;
        $user = $this->userSession->getUser();
        if ($user !== null) {
            $isAdmin = $this->groupManager->isAdmin($user->getUID());
        }
        $response = new EpubTemplateResponse('renamer', 'reader', [
            'standalonePage' => true,
            'isAdmin' => $isAdmin,
        ]);
        $csp = new ReaderContentSecurityPolicy();
        $csp->addAllowedStyleDomain('blob:');
        $csp->addAllowedStyleDomain('data:');
        $csp->addAllowedFontDomain('blob:');
        $csp->addAllowedFrameDomain("'self'");
        $csp->addAllowedFrameDomain('blob:');
        $response->setContentSecurityPolicy($csp);
        return $response;
    }


    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function metadataRead(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['paths']) || !is_array($payload['paths'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $result = [];
            foreach ($payload['paths'] as $path) {
                $cleanPath = ltrim((string)$path, '/');
                if ($cleanPath === '') continue;

                try {
                    $meta = $this->metadataService->getMetadata($cleanPath);
                    $writable = $this->metadataService->isWritableFormat($cleanPath);
                    $readable = $meta !== null;
                    $diagnostic = null;
                    if (!$readable) {
                        $diagnostic = $this->metadataService->getRawTagKeys($cleanPath);
                    }
                    $fileInfo = null;
                    try {
                        $fileInfo = $this->metadataService->getFileInfo($cleanPath);
                    } catch (\Throwable $e) {
                        $fileInfo = null;
                    }
                    $result[] = [
                        'path' => $cleanPath,
                        'metadata' => $meta,
                        'writable' => $writable,
                        'readable' => $readable,
                        'error' => null,
                        'diagnostic' => $diagnostic,
                        'fileInfo' => $fileInfo,
                    ];
                } catch (\Throwable $e) {
                    $result[] = [
                        'path' => $cleanPath,
                        'metadata' => null,
                        'writable' => false,
                        'readable' => false,
                        'error' => $e->getMessage(),
                        'diagnostic' => null,
                    ];
                }
            }

            return new DataResponse(['success' => true, 'files' => $result]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function metadataReadFolder(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $files = $this->metadataService->readFolder($payload['path']);

            return new DataResponse(['success' => true, 'files' => $files]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function listFiles(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '/');
            $user = $this->userSession->getUser();
            if ($user === null) {
                throw new \RuntimeException('No user session');
            }

            $uid = $user->getUID();
            $ownerUid = isset($payload['ownerUid']) && $payload['ownerUid'] !== '' ? (string)$payload['ownerUid'] : null;
            if ($ownerUid !== null) {
                $uid = $ownerUid;
            }
            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                $folder = $userFolder->get($path);
            } catch (\Throwable $e) {
                return new DataResponse(['success' => false, 'error' => 'Folder not found: ' . $e->getMessage()], 404);
            }

            if (!$folder->isReadable() || !($folder instanceof \OCP\Files\Folder)) {
                return new DataResponse(['success' => false, 'error' => 'Folder not readable or not a directory'], 400);
            }

            $files = [];
            $folders = [];
            try {
                $children = $folder->getDirectoryListing();
                foreach ($children as $child) {
                    if ($child instanceof \OCP\Files\Folder) {
                        $folders[] = $path . '/' . $child->getName();
                    } else {
                        $files[] = $path . '/' . $child->getName();
                    }
                }
            } catch (\Throwable $e) {
                return new DataResponse(['success' => false, 'error' => 'Cannot list folder: ' . $e->getMessage()], 500);
            }

            return new DataResponse([
                'success' => true,
                'path' => $path,
                'files' => $files,
                'folders' => $folders,
            ]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function metadataDiagnose(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $diagnostic = $this->metadataService->getRawTagKeys($payload['path']);

            return new DataResponse(['success' => true, 'diagnostic' => $diagnostic]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function metadataWrite(): Response {
        $this->logger->debug('metadataWrite ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['paths']) || !is_array($payload['paths'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $paths = $payload['paths'];
            $rules = $payload['rules'] ?? [];
            $manualOverrides = $payload['manualOverrides'] ?? [];

            $updated = [];
            $skipped = [];
            $errors = [];

            foreach ($paths as $path) {
                $cleanPath = ltrim((string)$path, '/');
                if ($cleanPath === '') {
                    continue;
                }

                $currentMeta = $this->metadataService->getMetadata($cleanPath);
                if ($currentMeta === null) {
                    $skipped[] = $cleanPath . ' (no metadata or unsupported format)';
                    continue;
                }

                $originalMeta = $manualOverrides[$cleanPath] ?? $currentMeta;
                $newMeta = $this->metadataService->applyRules($originalMeta, $rules);

                $writeResult = $this->metadataService->writeMetadata($cleanPath, $newMeta, $originalMeta);
                if ($writeResult['success']) {
                    $updated[] = $cleanPath;
                } else {
                    $errors[] = $cleanPath . ': ' . ($writeResult['error'] ?? 'Unknown error');
                }
            }

            return new DataResponse([
                'success' => empty($errors),
                'updated' => $updated,
                'skipped' => $skipped,
                'errors' => $errors,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('metadataWrite EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @AdminRequired
     */
    public function test(): DataResponse {
        $this->logger->debug('test() called', ['app' => 'renamer']);
        return new DataResponse(['ok' => true, 'msg' => 'test endpoint reachable']);
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function doRename(): Response {
        $this->logger->info('doRename ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true) ?: [];
            $paths = $payload['paths'] ?? [];
            $rules = $payload['rules'] ?? [];
            $renames = $payload['renames'] ?? [];

            if (empty($rules) && !empty($payload['mode'])) {
                $rules = [[
                    'mode' => $payload['mode'],
                    'pattern' => $payload['pattern'] ?? '',
                    'replacement' => $payload['replacement'] ?? '',
                    'target' => $payload['target'] ?? 'full',
                    'sequenceType' => $payload['sequenceType'] ?? null,
                    'startValue' => $payload['startValue'] ?? 1,
                    'zeroPadding' => $payload['zeroPadding'] ?? 0,
                    'isInc' => !empty($payload['increment']),
                    'incSep' => $payload['incSep'] ?? ' - ',
                    'incFormat' => $payload['incFormat'] ?? '{name}{sep}{i}',
                    'enabled' => true,
                ]];
            }

            $result = $this->renameService->execute($paths, $rules, $renames);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('doRename EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'renamed' => [], 'skipped' => [], 'errors' => [$e->getMessage()]]);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function playlistExport(): Response {
        $this->logger->debug('playlistExport ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true) ?: [];
            $paths = $payload['paths'] ?? [];
            $filename = isset($payload['filename']) ? basename((string)$payload['filename']) : 'playlist.m3u8';
            $folder = isset($payload['folder']) ? ltrim((string)$payload['folder'], '/') : '';

            if (!is_array($paths) || empty($paths)) {
                return new DataResponse(['success' => false, 'error' => 'No paths provided'], 400);
            }

            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $uid = $user->getUID();

            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                $targetFolder = $folder === '' ? $userFolder : $userFolder->get($folder);
            } catch (\Throwable $e) {
                return new DataResponse(['success' => false, 'error' => 'Folder not found: ' . $e->getMessage()], 404);
            }

            if (!$targetFolder->isReadable() || !($targetFolder instanceof \OCP\Files\Folder)) {
                return new DataResponse(['success' => false, 'error' => 'Folder not writable or not a directory'], 400);
            }

            $safeFilename = preg_replace('/[^A-Za-z0-9_\-\.]+/', '_', $filename);
            if ($safeFilename === '' || strpos($safeFilename, '.') === false) {
                $safeFilename = 'playlist.m3u8';
            }
            if (strtolower(pathinfo($safeFilename, PATHINFO_EXTENSION)) !== 'm3u8') {
                $safeFilename .= '.m3u8';
            }

            $basePath = rtrim((string)$targetFolder->getPath(), '/');
            $collisionSuffix = '';
            while (true) {
                $testName = $safeFilename;
                if ($collisionSuffix !== '') {
                    $testName = pathinfo($safeFilename, PATHINFO_FILENAME) . $collisionSuffix . '.' . pathinfo($safeFilename, PATHINFO_EXTENSION);
                }
                try {
                    $targetFolder->get($testName);
                    $collisionSuffix = $collisionSuffix === '' ? ' (1)' : ' (' . ((int)substr($collisionSuffix, 2, -1) + 1) . ')';
                } catch (\Throwable $e) {
                    $safeFilename = $testName;
                    break;
                }
            }

            $lines = ["#EXTM3U", "#EXTENC: UTF-8"];
            foreach ($paths as $path) {
                $cleanPath = ltrim((string)$path, '/');
                if ($cleanPath === '') continue;
                $name = basename($cleanPath);
                try {
                    $node = $userFolder->get($cleanPath);
                    if ($node->isReadable() && $node instanceof \OCP\Files\File) {
                        $duration = 0;
                        try {
                            $fileInfo = $this->metadataService->getFileInfo($cleanPath);
                            if ($fileInfo && isset($fileInfo['duration']) && $fileInfo['duration'] !== null) {
                                $duration = (int)$fileInfo['duration'];
                            }
                        } catch (\Throwable $e) {
                            $duration = 0;
                        }
                        $displayName = str_replace(['_', '-'], ' ', pathinfo($name, PATHINFO_FILENAME));
                        $lines[] = '#EXTINF:' . $duration . ',' . $displayName;
                        $relativePath = $name;
                        $lines[] = $relativePath;
                    }
                } catch (\Throwable $e) {
                    continue;
                }
            }

            $content = implode("\n", $lines) . "\n";
            $file = $targetFolder->newFile($safeFilename);
            $file->putContent($content);

            return new DataResponse([
                'success' => true,
                'filename' => $safeFilename,
                'path' => ($folder === '' ? '' : $folder . '/') . $safeFilename,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('playlistExport EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function readFile(): Response {
        try {
            $path = $_GET['path'] ?? '';
            if ($path === '') {
                return new DataResponse(['error' => 'No path'], 400);
            }

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['error' => 'No user session'], 401);
            }
            $ownerUid = isset($_GET['ownerUid']) && $_GET['ownerUid'] !== '' ? (string)$_GET['ownerUid'] : null;
            $uid = $ownerUid ?? $user->getUID();
            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                $node = $userFolder->get(ltrim($path, '/'));
            } catch (\Throwable $e) {
                return new DataResponse(['error' => 'File not found: ' . $e->getMessage()], 404);
            }
            if (!$node instanceof File) {
                return new DataResponse(['error' => 'Not a file'], 400);
            }
            if (!$node->isReadable()) {
                return new DataResponse(['error' => 'Not readable'], 403);
            }

            $stream = $node->fopen('rb');
            return new StreamResponse($stream, 200, [
                'Content-Type' => $node->getMimeType(),
                'Content-Length' => (string) $node->getSize(),
            ]);
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function fileBlob(): Response {
        try {
            $path = $_GET['path'] ?? '';
            if ($path === '') {
                return new DataResponse(['error' => 'No path'], 400);
            }

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['error' => 'No user session'], 401);
            }
            $ownerUid = isset($_GET['ownerUid']) && $_GET['ownerUid'] !== '' ? (string)$_GET['ownerUid'] : null;
            $uid = $ownerUid ?? $user->getUID();
            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                $node = $userFolder->get(ltrim($path, '/'));
            } catch (\Throwable $e) {
                return new DataResponse(['error' => 'File not found: ' . $e->getMessage()], 404);
            }
            if (!$node instanceof File) {
                return new DataResponse(['error' => 'Not a file'], 400);
            }
            if (!$node->isReadable()) {
                return new DataResponse(['error' => 'Not readable'], 403);
            }

            $stream = $node->fopen('rb');
            return new StreamResponse($stream, 200, [
                'Content-Type' => $node->getMimeType(),
                'Content-Length' => (string) $node->getSize(),
            ]);
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function fileInfo(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '/');
            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['error' => 'No user session'], 401);
            }
            $uid = $user->getUID();
            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                $node = $userFolder->get($path);
            } catch (\Throwable $e) {
                return new DataResponse(['error' => 'Not found'], 404);
            }
            if (!$node instanceof File) {
                return new DataResponse(['error' => 'Not a file'], 400);
            }

            $ext = strtolower(pathinfo($node->getName(), PATHINFO_EXTENSION));
            $supported = ['pdf', 'cbz', 'cbr', 'epub', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
            $type = in_array($ext, $supported) ? $ext : 'unknown';

            return new DataResponse([
                'success' => true,
                'id' => $node->getId(),
                'path' => '/' . $node->getInternalPath(),
                'name' => $node->getName(),
                'extension' => $ext,
                'type' => $type,
                'size' => $node->getSize(),
                'mtime' => $node->getMTime(),
            ]);
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function scanFolder(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '/');
            $recursive = isset($payload['recursive']) ? (bool)$payload['recursive'] : true;

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['error' => 'No user session'], 401);
            }
            $ownerUid = isset($payload['ownerUid']) && $payload['ownerUid'] !== '' ? (string)$payload['ownerUid'] : null;
            $uid = $ownerUid ?? $user->getUID();

            $files = $this->scanFolderRecursive($path, $uid, $recursive);

            return new DataResponse(['success' => true, 'files' => $files]);
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    private const SUPPORTED_SCAN_EXTENSIONS = ['pdf', 'cbz', 'cbr', 'epub', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
    private const DOC_EXT = ['pdf', 'cbz', 'cbr', 'epub'];
    private const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    /**
     * Classifie les fichiers scannés en collections en arbre récursif.
     *
     * - Les fichiers documents (pdf/cbz/cbr/epub) à la racine d'un dossier deviennent
     *   les tomes de la collection.
     * - Les images à la racine vont dans une sous-collec "Images".
     * - Un dossier nommé "images" (case-insensitive) est fusionné avec les images
     *   lâches.
     * - Les sous-dossiers deviennent des sous-collections récursives.
     *
     * Retourne un tableau { name => { folder, files, children } } dont chaque
     * entrée de premier niveau est une collection (dossier de premier niveau ou
     * racine), avec un arbre `children` contenant les sous-collections.
     */
    private function classifyFilesForLibrary(array $files, string $rootFolder): array {
        $prefix = trim($rootFolder, '/');
        $rootParts = explode('/', $prefix);
        $rootBase = end($rootParts);
        if ($rootBase === '' || $rootBase === false) {
            $rootBase = 'Bibliothèque';
        }

        $folderMap = [];
        foreach ($files as $f) {
            $ext = strtolower((string)($f['extension'] ?? ''));
            if (!in_array($ext, self::DOC_EXT, true) && !in_array($ext, self::IMG_EXT, true)) continue;

            $absPath = ltrim((string)($f['path'] ?? ''), '/');
            if ($prefix !== '' && strpos($absPath, $prefix . '/') === 0) {
                $rel = substr($absPath, strlen($prefix) + 1);
            } else {
                $rel = $absPath;
            }

            $slashIdx = strrpos($rel, '/');
            $folderRel = $slashIdx === false ? '' : substr($rel, 0, $slashIdx);

            if (!isset($folderMap[$folderRel])) {
                $folderMap[$folderRel] = ['documents' => [], 'images' => []];
            }

            $entry = [
                'path' => $f['path'],
                'name' => $f['name'],
                'tome' => 0,
                'type' => $ext,
                'size' => (int)($f['size'] ?? 0),
                'mtime' => (int)($f['mtime'] ?? 0),
            ];

            if (in_array($ext, self::DOC_EXT, true)) {
                $folderMap[$folderRel]['documents'][] = $entry;
            } else {
                $folderMap[$folderRel]['images'][] = $entry;
            }
        }

        foreach ($folderMap as $key => $fd) {
            usort($folderMap[$key]['documents'], function($a, $b) {
                return strnatcmp((string)($a['name'] ?? ''), (string)($b['name'] ?? ''));
            });
            usort($folderMap[$key]['images'], function($a, $b) {
                return strnatcmp((string)($a['name'] ?? ''), (string)($b['name'] ?? ''));
            });
            foreach ($folderMap[$key]['documents'] as $i => &$doc) {
                $doc['tome'] = $i + 1;
            }
        }
        unset($doc);

        $folderSet = [];
        foreach (array_keys($folderMap) as $folderRel) {
            if (!$folderRel) continue;
            $parts = explode('/', $folderRel);
            for ($i = 1; $i <= count($parts); $i++) {
                $folderSet[implode('/', array_slice($parts, 0, $i))] = true;
            }
        }

        $folderAbs = function($folderRel) use ($prefix) {
            if (!$prefix) return $folderRel;
            return $folderRel === '' ? $prefix : $prefix . '/' . $folderRel;
        };

        $folderName = function($folderRel) use ($rootBase) {
            if ($folderRel === '') return $rootBase;
            $pos = strrpos($folderRel, '/');
            return $pos === false ? $folderRel : substr($folderRel, $pos + 1);
        };

        $directSubfolders = function($folderRel) use ($folderSet) {
            $result = [];
            $expected = $folderRel !== '' ? $folderRel . '/' : '';
            foreach (array_keys($folderSet) as $key) {
                if ($key === $folderRel) continue;
                if ($expected === '') {
                    if (strpos($key, '/') === false) {
                        $result[] = $key;
                    }
                } else {
                    if (strpos($key, $expected) === 0) {
                        $rem = substr($key, strlen($expected));
                        if (strpos($rem, '/') === false) {
                            $result[] = $key;
                        }
                    }
                }
            }
            sort($result);
            return $result;
        };

        $buildNode = function($folderRel, $isRoot) use (
            &$buildNode, $folderMap, $folderAbs, $folderName, $directSubfolders
        ) {
            $fd = isset($folderMap[$folderRel]) ? $folderMap[$folderRel] : ['documents' => [], 'images' => []];
            $subs = $directSubfolders($folderRel);

            $looseImages = $fd['images'];
            $otherSubs = [];

            foreach ($subs as $subRel) {
                $subName = $folderName($subRel);
                if (strtolower($subName) === 'images') {
                    $subFd = isset($folderMap[$subRel]) ? $folderMap[$subRel] : ['documents' => [], 'images' => []];
                    $looseImages = array_merge($looseImages, $subFd['images'], $subFd['documents']);
                } else {
                    $otherSubs[] = $subRel;
                }
            }

            $children = [];

            if (count($looseImages) > 0) {
                usort($looseImages, function($a, $b) {
                    return strnatcmp((string)($a['name'] ?? ''), (string)($b['name'] ?? ''));
                });
                foreach ($looseImages as &$img) { $img['tome'] = 0; }
                unset($img);
                $children[] = [
                    'name' => 'Images',
                    'folder' => $folderAbs($folderRel),
                    'files' => $looseImages,
                    'children' => [],
                    'isImages' => true,
                ];
            }

            if (!$isRoot) {
                foreach ($otherSubs as $subRel) {
                    $childNode = $buildNode($subRel, false);
                    if ($childNode) {
                        $children[] = $childNode;
                    }
                }
            }

            if (count($fd['documents']) === 0 && count($children) === 0) {
                return null;
            }

            return [
                'name' => $folderName($folderRel),
                'folder' => $folderAbs($folderRel),
                'files' => $fd['documents'],
                'children' => $children,
                'isImages' => false,
            ];
        };

        $result = [];

        $rootNode = $buildNode('', true);
        if ($rootNode) {
            $result[$rootNode['name']] = $rootNode;
        }

        $topLevel = $directSubfolders('');
        foreach ($topLevel as $folderRel) {
            $node = $buildNode($folderRel, false);
            if ($node) {
                $result[$node['name']] = $node;
            }
        }

        $this->logger->debug('classifyFilesForLibrary: result keys = ' . implode(', ', array_keys($result)), ['app' => 'renamer']);
        foreach ($result as $name => $node) {
            $childCount = is_array($node['children'] ?? null) ? count($node['children']) : 0;
            $fileCount = is_array($node['files'] ?? null) ? count($node['files']) : 0;
            $this->logger->debug('classifyFilesForLibrary: collection "' . $name . '" files=' . $fileCount . ' children=' . $childCount, ['app' => 'renamer']);
        }

        return $result;
    }

    /**
     * Scanne récursivement un dossier utilisateur et retourne la liste des
     * fichiers supportés. Méthode privée partagée par scanFolder() et les
     * endpoints de rescan.
     *
     * @return array<int, array{path:string, name:string, extension:string, size:int, mtime:int}>
     */
    private function scanFolderRecursive(string $path, string $uid, bool $recursive = true): array {
        try {
            $userFolder = $this->rootFolder->getUserFolder($uid);
            $folder = $userFolder->get($path);
        } catch (\Throwable $e) {
            return [];
        }
        if (!$folder instanceof \OCP\Files\Folder || !$folder->isReadable()) {
            return [];
        }

        $files = [];
        $iterator = function($dir, $relPath) use (&$iterator, $recursive, &$files) {
            try {
                $children = $dir->getDirectoryListing();
            } catch (\Throwable $e) {
                return;
            }
            foreach ($children as $child) {
                $childRelPath = $relPath . '/' . $child->getName();
                if ($child instanceof \OCP\Files\Folder) {
                    if ($recursive) {
                        $iterator($child, $childRelPath);
                    }
                    continue;
                }
                if (!$child instanceof \OCP\Files\File) continue;
                $ext = strtolower(pathinfo($child->getName(), PATHINFO_EXTENSION));
                if (in_array($ext, self::SUPPORTED_SCAN_EXTENSIONS, true)) {
                    $files[] = [
                        'path' => '/' . ltrim($childRelPath, '/'),
                        'name' => $child->getName(),
                        'extension' => $ext,
                        'size' => (int) $child->getSize(),
                        'mtime' => (int) $child->getMTime(),
                    ];
                }
            }
        };
        $iterator($folder, $path);

        return $files;
    }

    /**
     * Re-scanne une bibliothèque complète : re-parcourt le dossier racine stocké
     * dans library.description, reconstruit les collections (update in-place par
     * nom, create pour les nouvelles, delete pour les disparues).
     *
     * Les progrès de lecture et favoris sont **presérivés** : ils sont
     * keyés sur (user_id, file_path), indépendamment des IDs collection/library.
     * Le rescan ne touche QUE la colonne rules des collections existantes.
     *
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function rescanLibrary(int $id): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $uid = $user->getUID();

            $library = $this->libraryMapper->find($id, $uid);
            if (!$library) {
                return new DataResponse(['success' => false, 'error' => 'Library not found'], 404);
            }

            $rootFolder = $library->getDescription() ?? '';
            if ($rootFolder === '') {
                return new DataResponse(['success' => false, 'error' => 'Library has no root folder'], 400);
            }

            $files = $this->scanFolderRecursive($rootFolder, $uid, true);
            $classified = $this->classifyFilesForLibrary($files, $rootFolder);

            $existing = $this->collectionMapper->findByLibraryId($library->getId());
            $existingByName = [];
            foreach ($existing as $col) {
                $existingByName[$col->getName()] = $col;
            }

            $updated = [];
            $created = [];
            $removed = [];

            foreach ($classified as $name => $data) {
                $rules = ['folder' => $data['folder'], 'files' => $data['files'], 'children' => $data['children'] ?? []];
                if (isset($existingByName[$name])) {
                    $col = $existingByName[$name];
                    $col->setRulesArray($rules);
                    $this->collectionMapper->update($col);
                    $updated[] = $col->getId();
                } else {
                    $col = new \OCA\Renamer\Db\Collection();
                    $col->setUserId($uid);
                    $col->setLibraryId($library->getId());
                    $col->setName($name);
                    $col->setDescription('');
                    $col->setRulesArray($rules);
                    $col = $this->collectionMapper->insert($col);
                    $created[] = $col->getId();
                }
            }

            foreach ($existingByName as $name => $col) {
                if (!array_key_exists($name, $classified)) {
                    $this->collectionMapper->delete($col);
                    $removed[] = $col->getId();
                }
            }

            $this->logger->info('rescanLibrary: lib=' . $library->getId() . ' files=' . count($files) . ' updated=' . count($updated) . ' created=' . count($created) . ' removed=' . count($removed), ['app' => 'renamer']);

            return new DataResponse([
                'success' => true,
                'libraryId' => $library->getId(),
                'updated' => $updated,
                'created' => $created,
                'removed' => $removed,
                'fileCount' => count($files),
                'collections' => count($classified),
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('rescanLibrary EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Re-scanne une collection spécifique : re-parcourt son dossier (rules.folder),
     * reconstruit l'arbre rules.files / rules.children avec les fichiers fraîchement
     * détectés.
     *
     * Les progrès de lecture et favoris sont **presérivés** : ils sont
     * keyés sur (user_id, file_path) et non sur l'ID collection. Le rescan
     * met à jour in-place la même collection (même ID), la colonne rules
     * est la seule modifiée.
     *
     * L'arbre récursif est restitué : les fichiers documents à la racine du
     * dossier deviennent des tomes, les sous-dossiers deviennent des
     * sous-collections (children), et les images vont dans une sous-collec
     * "Images".
     *
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function rescanCollection(int $id): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $uid = $user->getUID();

            $collection = $this->collectionMapper->find($id, $uid);
            if (!$collection) {
                return new DataResponse(['success' => false, 'error' => 'Collection not found'], 404);
            }

            $rules = $collection->getRulesArray();
            $folder = isset($rules['folder']) ? (string)$rules['folder'] : '';
            if ($folder === '') {
                return new DataResponse(['success' => false, 'error' => 'Collection has no folder'], 400);
            }

            $files = $this->scanFolderRecursive($folder, $uid, true);
            $classified = $this->classifyFilesForLibrary($files, $folder);

            // Le dossier de la collection = rootBase. Reconstruire l'arbre complet
            // en fusionnant les sous-dossiers de premier niveau (entrées du map)
            // dans children de l'entrée racine.
            $prefix = trim($folder, '/');
            $rootParts = explode('/', $prefix);
            $rootBase = end($rootParts);
            if ($rootBase === '' || $rootBase === false) {
                $rootBase = 'Bibliothèque';
            }

             $rootEntry = $classified[$rootBase] ?? ['folder' => $folder, 'files' => [], 'children' => []];

             $children = isset($rootEntry['children']) ? $rootEntry['children'] : [];
             foreach ($classified as $name => $data) {
                 if ($name === $rootBase) continue;
                 $children[] = $data;
             }

            $rules['folder'] = $rootEntry['folder'] ?? $folder;
              $rules['files'] = isset($rootEntry['files']) ? $rootEntry['files'] : [];
              $rules['children'] = $children;
              $this->logger->debug('rescanCollection: folder=' . $folder . ' rootBase=' . $rootBase . ' files=' . count($rules['files']) . ' children=' . count($rules['children']), ['app' => 'renamer']);
              $this->logger->debug('rescanCollection: classified keys = ' . implode(', ', array_keys($classified)), ['app' => 'renamer']);
              $collection->setRulesArray($rules);
            $collection = $this->collectionMapper->update($collection);

            $totalFiles = 0;
            $countDescendants = function($node) use (&$countDescendants, &$totalFiles) {
                $totalFiles += count($node['files'] ?? []);
                foreach (($node['children'] ?? []) as $child) {
                    $countDescendants($child);
                }
            };
            $countDescendants($rules);

            $this->logger->info('rescanCollection: col=' . $collection->getId() . ' folder=' . $folder . ' files=' . $totalFiles, ['app' => 'renamer']);

            return new DataResponse([
                'success' => true,
                'id' => $collection->getId(),
                'libraryId' => $collection->getLibraryId(),
                'name' => $collection->getName(),
                'fileCount' => $totalFiles,
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('rescanCollection EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function saveProgress(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path']) || empty($payload['type'])) {
                return new DataResponse(['error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '/');
            $type = (string)$payload['type'];
            $value = isset($payload['value']) ? (int)$payload['value'] : 0;
            $total = isset($payload['total']) ? (int)$payload['total'] : 0;

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['error' => 'No user session'], 401);
            }
            $uid = $user->getUID();

            $dbConnection = \OC::$server->getDatabaseConnection();
            $progressMapper = new \OCA\Renamer\Db\ReadingProgressMapper($dbConnection);

            $progress = new \OCA\Renamer\Db\ReadingProgress();
            $progress->setUserId($uid);
            $progress->setFilePath($path);
            $progress->setProgressType($type);
            $progress->setProgressValue($value);
            $progress->setProgressTotal($total);

            $progressMapper->upsert($progress);

            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('saveProgress EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function readProgress(): Response {
        try {
            $paths = [];
            if (!empty($_GET['paths']) && is_array($_GET['paths'])) {
                $paths = array_map(function($p) { return ltrim((string)$p, '/'); }, $_GET['paths']);
            } else {
                $content = file_get_contents('php://input');
                $payload = json_decode($content, true);
                if (is_array($payload) && !empty($payload['paths']) && is_array($payload['paths'])) {
                    $paths = array_map(function($p) { return ltrim((string)$p, '/'); }, $payload['paths']);
                }
            }

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['error' => 'No user session'], 401);
            }
            $uid = $user->getUID();

            $dbConnection = \OC::$server->getDatabaseConnection();
            $progressMapper = new \OCA\Renamer\Db\ReadingProgressMapper($dbConnection);

            if (!empty($paths)) {
                $progresses = $progressMapper->findByUserAndPaths($uid, $paths);
                $result = [];
                foreach ($progresses as $p) {
                    $result[$p->getFilePath()] = [
                        'type' => $p->getProgressType(),
                        'value' => $p->getProgressValue(),
                        'total' => $p->getProgressTotal(),
                        'lastAccessed' => $p->getLastAccessed() ? $p->getLastAccessed()->format('Y-m-d H:i:s') : null,
                    ];
                }
                return new DataResponse(['success' => true, 'progress' => $result]);
            }

            $all = $progressMapper->findByUserId($uid);
            $result = [];
            foreach ($all as $p) {
                $result[$p->getFilePath()] = [
                    'type' => $p->getProgressType(),
                    'value' => $p->getProgressValue(),
                    'total' => $p->getProgressTotal(),
                    'lastAccessed' => $p->getLastAccessed() ? $p->getLastAccessed()->format('Y-m-d H:i:s') : null,
                ];
            }
            return new DataResponse(['success' => true, 'progress' => $result]);
        } catch (\Throwable $e) {
            $this->logger->error('readProgress EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function readProgressPost(): Response {
        return $this->readProgress();
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function deleteProgress(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '/');
            if ($path === '') {
                return new DataResponse(['success' => false, 'error' => 'No path'], 400);
            }

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['success' => false, 'error' => 'No user session'], 401);
            }
            $uid = $user->getUID();

            $dbConnection = \OC::$server->getDatabaseConnection();
            $progressMapper = new \OCA\Renamer\Db\ReadingProgressMapper($dbConnection);
            $progressMapper->deleteByFilePath($uid, $path);

            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('deleteProgress EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer']);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function readerFavorites(): Response {
        try {
            $path = $_GET['path'] ?? '';
            $path = ltrim((string)$path, '/');
            if ($path === '') {
                return new DataResponse(['success' => false, 'error' => 'No path'], 400);
            }

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['success' => false, 'error' => 'No user session'], 401);
            }
            $uid = $user->getUID();

            $connection = \OC::$server->getDatabaseConnection();
            $connection->executeStatement("CREATE TABLE IF NOT EXISTS `*PREFIX*renamer_user_preferences` (
                user_id VARCHAR(64) NOT NULL,
                preference_key VARCHAR(255) NOT NULL,
                preference_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, preference_key)
            )");

            $prefKey = 'reader_favorites_' . $path;
            $qb = $connection->getQueryBuilder();
            $qb->select('preference_value')
                ->from('renamer_user_preferences')
                ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($uid)))
                ->andWhere($qb->expr()->eq('preference_key', $qb->createNamedParameter($prefKey)))
                ->setMaxResults(1);
            $result = $qb->executeQuery();
            $row = $result->fetch();

            $pages = [];
            if ($row && isset($row['preference_value']) && $row['preference_value'] !== null) {
                $decoded = json_decode($row['preference_value'], true);
                if (is_array($decoded)) {
                    $pages = array_values(array_filter($decoded, function($v) { return is_int($v) || is_numeric($v); }));
                    $pages = array_map('intval', $pages);
                }
            }

            return new DataResponse(['success' => true, 'pages' => $pages]);
        } catch (\Throwable $e) {
            $this->logger->error('readerFavorites EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function readerToggleFavorite(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path']) || !isset($payload['pages'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '/');
            if ($path === '') {
                return new DataResponse(['success' => false, 'error' => 'No path'], 400);
            }

            $pages = array_values(array_filter($payload['pages'], function($v) { return is_int($v) || is_numeric($v); }));
            $pages = array_map('intval', $pages);
            $pages = array_values(array_unique($pages));
            sort($pages);

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['success' => false, 'error' => 'No user session'], 401);
            }
            $uid = $user->getUID();

            $connection = \OC::$server->getDatabaseConnection();
            $connection->executeStatement("CREATE TABLE IF NOT EXISTS `*PREFIX*renamer_user_preferences` (
                user_id VARCHAR(64) NOT NULL,
                preference_key VARCHAR(255) NOT NULL,
                preference_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, preference_key)
            )");

            $prefKey = 'reader_favorites_' . $path;
            $qb = $connection->getQueryBuilder();
            $qb->delete('renamer_user_preferences')
                ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($uid)))
                ->andWhere($qb->expr()->eq('preference_key', $qb->createNamedParameter($prefKey)))
                ->executeStatement();

            $qb = $connection->getQueryBuilder();
            $qb->insert('renamer_user_preferences')
                ->values([
                    'user_id' => $qb->createNamedParameter($uid),
                    'preference_key' => $qb->createNamedParameter($prefKey),
                    'preference_value' => $qb->createNamedParameter(json_encode($pages)),
                ])
                ->executeStatement();

            return new DataResponse(['success' => true, 'pages' => $pages]);
        } catch (\Throwable $e) {
            $this->logger->error('readerToggleFavorite EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function readerFavoritesList(): Response {
        try {
            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['success' => false, 'error' => 'No user session'], 401);
            }
            $uid = $user->getUID();

            $connection = \OC::$server->getDatabaseConnection();
            $connection->executeStatement("CREATE TABLE IF NOT EXISTS `*PREFIX*renamer_user_preferences` (
                user_id VARCHAR(64) NOT NULL,
                preference_key VARCHAR(255) NOT NULL,
                preference_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, preference_key)
            )");

            $qb = $connection->getQueryBuilder();
            $qb->select('preference_key', 'preference_value')
                ->from('renamer_user_preferences')
                ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($uid)))
                ->andWhere($qb->expr()->like('preference_key', $qb->createNamedParameter('reader_favorites_%')));
            $result = $qb->executeQuery();

            $favorites = [];
            while ($row = $result->fetch()) {
                $key = $row['preference_key'];
                $path = substr($key, strlen('reader_favorites_'));
                $pages = [];
                if ($row['preference_value'] !== null) {
                    $decoded = json_decode($row['preference_value'], true);
                    if (is_array($decoded)) {
                        $pages = array_values(array_filter($decoded, function($v) { return is_int($v) || is_numeric($v); }));
                        $pages = array_map('intval', $pages);
                    }
                }
                $favorites[] = ['path' => $path, 'pages' => $pages];
            }

            return new DataResponse(['success' => true, 'favorites' => $favorites]);
        } catch (\Throwable $e) {
            $this->logger->error('readerFavoritesList EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function pdfConvertCbz(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true) ?: [];
            $paths = $payload['paths'] ?? [];
            $ownerUid = isset($payload['ownerUid']) && $payload['ownerUid'] !== '' ? (string)$payload['ownerUid'] : null;
            if (!is_array($paths) || empty($paths)) {
                return new DataResponse(['success' => false, 'converted' => [], 'skipped' => [], 'errors' => ['No paths provided']], 400);
            }
            $result = $this->pdfService->convertToCbz($paths, $ownerUid);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('pdfConvertCbz EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'converted' => [], 'skipped' => [], 'errors' => [$e->getMessage()]], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function pdfPreview(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true) ?: [];
            $paths = $payload['paths'] ?? [];
            $thumbWidth = (int)($payload['thumbnailWidth'] ?? 150);
            $ownerUid = isset($payload['ownerUid']) && $payload['ownerUid'] !== '' ? (string)$payload['ownerUid'] : null;

            if (!is_array($paths) || empty($paths)) {
                return new DataResponse(['success' => false, 'results' => [], 'errors' => ['No paths provided']], 400);
            }

            $result = $this->pdfService->previewPdf($paths, $thumbWidth, $ownerUid);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('pdfPreview EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'results' => [], 'errors' => [$e->getMessage()]], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function pdfPage(): Response {
        try {
            $path = $_GET['path'] ?? '';
            $page = max(1, (int)($_GET['page'] ?? 1));
            $widthParam = $_GET['width'] ?? null;
            $width = $widthParam !== null ? max(100, (int)$widthParam) : null;

            if ($path === '') {
                return new DataResponse(['success' => false, 'error' => 'No path'], 400);
            }

            $ownerUid = isset($_GET['ownerUid']) && $_GET['ownerUid'] !== '' ? (string)$_GET['ownerUid'] : null;
            $result = $this->pdfService->renderPage($path, $page, $width, $ownerUid);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('pdfPage EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'path' => '', 'page' => 0, 'pageCount' => 0, 'dataUrl' => '', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function rules(): Response {
        $this->logger->debug('rules() ENTRY', ['app' => 'renamer']);
        try {
            $userRules = $this->ruleService->listUserRules();
            $defaultRules = $this->ruleService->listDefaultRules();
            $format = function($rules) {
                return array_map(function($r) {
                    return [
                        'id' => $r->getId(),
                        'name' => $r->getName(),
                        'mode' => $r->getMode(),
                        'pattern' => $r->getPattern(),
                        'replacement' => $r->getReplacement(),
                        'target' => $r->getTarget(),
                        'sequenceType' => $r->getSequenceType(),
                        'startValue' => $r->getStartValue(),
                        'zeroPadding' => $r->getZeroPadding(),
                        'enabled' => $r->isEnabled(),
                        'filterMode' => $r->getFilterMode(),
                        'extensions' => $r->getExtensionsArray(),
                        'isDefault' => $r->isDefault(),
                    ];
                }, $rules);
            };
            return new DataResponse(['user' => $format($userRules), 'defaults' => $format($defaultRules)]);
        } catch (\Throwable $e) {
            $this->logger->error('rules() EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function createRule(): Response {
        $this->logger->debug('createRule() ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name']) || !isset($payload['mode']) || !isset($payload['pattern']) || !isset($payload['replacement'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $rule = $this->ruleService->createRule(
                $payload['name'],
                $payload['mode'],
                $payload['pattern'],
                $payload['replacement'],
                $payload['target'] ?? 'full',
                $payload['sequenceType'] ?? null,
                $payload['startValue'] ?? 1,
                $payload['zeroPadding'] ?? 0,
                $payload['enabled'] ?? true,
                $payload['filterMode'] ?? 'ignored',
                isset($payload['extensions']) && is_array($payload['extensions']) ? json_encode($payload['extensions']) : null,
                $payload['scope'] ?? 'advanced',
                $payload['metadataField'] ?? ''
            );
            return new DataResponse([
                'id' => $rule->getId(),
                'name' => $rule->getName(),
                'mode' => $rule->getMode(),
                'pattern' => $rule->getPattern(),
                'replacement' => $rule->getReplacement(),
                'target' => $rule->getTarget(),
                'sequenceType' => $rule->getSequenceType(),
                'startValue' => $rule->getStartValue(),
                'zeroPadding' => $rule->getZeroPadding(),
                'enabled' => $rule->isEnabled(),
                'filterMode' => $rule->getFilterMode(),
                'extensions' => $rule->getExtensionsArray(),
                'scope' => $rule->getScope(),
                'metadataField' => $rule->getMetadataField(),
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('createRule EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function updateRule(int $id): Response {
        $this->logger->debug('updateRule() ENTRY id=' . $id, ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name']) || !isset($payload['mode']) || !isset($payload['pattern']) || !isset($payload['replacement'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $rule = $this->ruleService->updateRule(
                $id,
                $payload['name'],
                $payload['mode'],
                $payload['pattern'],
                $payload['replacement'],
                $payload['target'] ?? 'full',
                $payload['sequenceType'] ?? null,
                $payload['startValue'] ?? 1,
                $payload['zeroPadding'] ?? 0,
                $payload['enabled'] ?? true,
                $payload['filterMode'] ?? 'ignored',
                isset($payload['extensions']) && is_array($payload['extensions']) ? json_encode($payload['extensions']) : null,
                $payload['scope'] ?? 'advanced',
                $payload['metadataField'] ?? ''
            );
            if (!$rule) {
                return new DataResponse(['success' => false, 'error' => 'Rule not found'], 404);
            }
            return new DataResponse([
                'id' => $rule->getId(),
                'name' => $rule->getName(),
                'mode' => $rule->getMode(),
                'pattern' => $rule->getPattern(),
                'replacement' => $rule->getReplacement(),
                'target' => $rule->getTarget(),
                'sequenceType' => $rule->getSequenceType(),
                'startValue' => $rule->getStartValue(),
                'zeroPadding' => $rule->getZeroPadding(),
                'enabled' => $rule->isEnabled(),
                'filterMode' => $rule->getFilterMode(),
                'extensions' => $rule->getExtensionsArray(),
                'scope' => $rule->getScope(),
                'metadataField' => $rule->getMetadataField(),
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('updateRule EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function deleteRule(int $id): Response {
        $this->logger->debug('deleteRule() ENTRY id=' . $id, ['app' => 'renamer']);
        try {
            $this->ruleService->deleteRule($id);
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('deleteRule EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function importRules(): Response {
        $this->logger->debug('importRules() ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['rules']) || !is_array($payload['rules'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $result = $this->ruleService->importRules($payload['rules']);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('importRules EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function exportRules(): Response {
        $this->logger->debug('exportRules() ENTRY', ['app' => 'renamer']);
        try {
            $rules = $this->ruleService->exportRules();
            return new DataResponse(['rules' => $rules]);
        } catch (\Throwable $e) {
            $this->logger->error('exportRules EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function savePlan(): Response {
        $this->logger->debug('savePlan() ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['rules']) || !is_array($payload['rules'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $folderName = '.renamer';
            $userHome = $user->getHome();
            $folderPath = $userHome . '/' . $folderName;
            if (!file_exists($folderPath)) {
                mkdir($folderPath, 0700, true);
            }
            $requestedName = isset($payload['name']) ? basename((string)$payload['name']) : '';
            if ($requestedName === '' || !preg_match('/^[\w\-\.]+\.json$/', $requestedName)) {
                $fileName = 'plan-' . date('Y-m-d-H-i-s') . '.json';
            } else {
                $fileName = $requestedName;
            }
            $filePath = $folderPath . '/' . $fileName;
            file_put_contents($filePath, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return new DataResponse(['success' => true, 'path' => $folderName . '/' . $fileName, 'name' => $fileName]);
        } catch (\Throwable $e) {
            $this->logger->error('savePlan EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function deletePlan(string $name): Response {
        $this->logger->debug('deletePlan() ENTRY name=' . $name, ['app' => 'renamer']);
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $safeName = basename($name);
            if (!preg_match('/^[\w\-\.]+\.json$/', $safeName)) {
                return new DataResponse(['success' => false, 'error' => 'Invalid plan name'], 400);
            }
            $folderPath = $user->getHome() . '/.renamer';
            $filePath = $folderPath . '/' . $safeName;
            if (!file_exists($filePath)) {
                return new DataResponse(['success' => false, 'error' => 'Plan not found'], 404);
            }
            unlink($filePath);
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('deletePlan EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function loadPlan(string $name = ''): Response {
        $this->logger->debug('loadPlan() ENTRY name=' . $name, ['app' => 'renamer']);
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $folderName = '.renamer';
            $userHome = $user->getHome();
            $folderPath = $userHome . '/' . $folderName;
            if (!file_exists($folderPath)) {
                return new DataResponse(['success' => true, 'plans' => []]);
            }
            $files = scandir($folderPath);
            $plans = [];
            foreach ($files as $file) {
                if ($file === '.' || $file === '..') continue;
                if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
                    $fullPath = $folderPath . '/' . $file;
                    $mtime = filemtime($fullPath);
                    $plans[] = ['name' => $file, 'mtime' => $mtime];
                }
            }
            usort($plans, function($a, $b) { return $b['mtime'] - $a['mtime']; });
            if ($name !== '') {
                $safeName = basename($name);
                $filePath = $folderPath . '/' . $safeName;
                if (!file_exists($filePath)) {
                    return new DataResponse(['success' => false, 'error' => 'Plan not found'], 404);
                }
                $content = file_get_contents($filePath);
                $data = json_decode($content, true);
                return new DataResponse(['success' => true, 'plan' => $data, 'name' => $safeName]);
            }
            return new DataResponse(['success' => true, 'plans' => $plans]);
        } catch (\Throwable $e) {
            $this->logger->error('loadPlan EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function getTranslations(): Response {
        $this->logger->debug('getTranslations() ENTRY', ['app' => 'renamer']);
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $language = $this->request->getHeader('Accept-Language');
            if (strpos($language, 'fr') === 0) {
                $language = 'fr';
            } else {
                $language = 'en';
            }
            
            $connection = \OC::$server->getDatabaseConnection();
            $tableName = \OC::$server->getConfig()->getSystemValue('dbtableprefix', 'oc_') . 'renamer_translations';
            $connection->executeStatement("CREATE TABLE IF NOT EXISTS " . $tableName . " (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL,
                translation_key VARCHAR(255) NOT NULL,
                language VARCHAR(10) NOT NULL,
                translated_text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_user_key_lang (user_id, translation_key, language)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            try {
                $connection->executeStatement("ALTER TABLE " . $tableName . " MODIFY updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            } catch (\Throwable $e) {
            }
            try {
                $connection->executeStatement("ALTER TABLE " . $tableName . " MODIFY created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
            } catch (\Throwable $e) {
            }
            
            $sql = "SELECT translation_key, translated_text FROM " . $tableName . " WHERE user_id = ? AND language = ?";
            $result = $connection->executeQuery($sql, [$userId, $language])->fetchAll();
            
            $translations = [];
            foreach ($result as $row) {
                $translations[$row['translation_key']] = $row['translated_text'];
            }
            
            return new DataResponse(['success' => true, 'translations' => $translations]);
        } catch (\Throwable $e) {
            $this->logger->error('getTranslations EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function saveTranslation(): Response {
        $this->logger->debug('saveTranslation() ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['translationKey']) || empty($payload['translatedText'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $language = !empty($payload['language']) ? $payload['language'] : $this->request->getHeader('Accept-Language');
            if (strpos($language, 'fr') === 0) {
                $language = 'fr';
            } else {
                $language = 'en';
            }
            
            $connection = \OC::$server->getDatabaseConnection();
            $tableName = \OC::$server->getConfig()->getSystemValue('dbtableprefix', 'oc_') . 'renamer_translations';
            $connection->executeStatement("CREATE TABLE IF NOT EXISTS " . $tableName . " (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(64) NOT NULL,
                translation_key VARCHAR(255) NOT NULL,
                language VARCHAR(10) NOT NULL,
                translated_text TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uk_user_key_lang (user_id, translation_key, language)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            try {
                $connection->executeStatement("ALTER TABLE " . $tableName . " MODIFY updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            } catch (\Throwable $e) {
            }
            try {
                $connection->executeStatement("ALTER TABLE " . $tableName . " MODIFY created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
            } catch (\Throwable $e) {
            }
            
            $sql = "INSERT INTO " . $tableName . " (user_id, translation_key, language, translated_text) VALUES (?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text), updated_at = CURRENT_TIMESTAMP";
            $connection->executeStatement($sql, [$userId, $payload['translationKey'], $language, $payload['translatedText']]);
            
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('saveTranslation EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function getUserPreferences(): Response {
        $this->logger->debug('getUserPreferences() ENTRY', ['app' => 'renamer']);
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $connection = \OC::$server->getDatabaseConnection();
            $tableName = \OC::$server->getConfig()->getSystemValue('dbtableprefix', 'oc_') . 'renamer_user_preferences';
            $connection->executeStatement("CREATE TABLE IF NOT EXISTS " . $tableName . " (
                user_id VARCHAR(64) NOT NULL,
                preference_key VARCHAR(255) NOT NULL,
                preference_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, preference_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            $sql = "SELECT preference_key, preference_value FROM " . $tableName . " WHERE user_id = ?";
            $result = $connection->executeQuery($sql, [$userId])->fetchAll();
            
            $prefs = [];
            foreach ($result as $row) {
                $decoded = json_decode($row['preference_value'], true);
                $prefs[$row['preference_key']] = $decoded;
            }
            
            return new DataResponse(['success' => true, 'preferences' => $prefs]);
        } catch (\Throwable $e) {
            $this->logger->error('getUserPreferences EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function saveUserPreference(): Response {
        $this->logger->debug('saveUserPreference() ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['key']) || !isset($payload['value'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $connection = \OC::$server->getDatabaseConnection();
            $tableName = \OC::$server->getConfig()->getSystemValue('dbtableprefix', 'oc_') . 'renamer_user_preferences';
            $connection->executeStatement("CREATE TABLE IF NOT EXISTS " . $tableName . " (
                user_id VARCHAR(64) NOT NULL,
                preference_key VARCHAR(255) NOT NULL,
                preference_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, preference_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            $sql = "INSERT INTO " . $tableName . " (user_id, preference_key, preference_value) VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE preference_value = VALUES(preference_value), updated_at = CURRENT_TIMESTAMP";
            $connection->executeStatement($sql, [$userId, $payload['key'], json_encode($payload['value'])]);
            
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('saveUserPreference EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function navigationFavorites(): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $uid = $user->getUID();
            $userFolder = $this->rootFolder->getUserFolder($uid);

            $tagManager = $this->tagManager;
            $tags = $tagManager->load('files', [], false, $uid);
            if ($tags === null) {
                return new DataResponse(['success' => true, 'favorites' => []]);
            }

            $favoriteIds = $tags->getFavorites();
            if (!$favoriteIds || !is_array($favoriteIds)) {
                return new DataResponse(['success' => true, 'favorites' => []]);
            }

            $favorites = [];
            foreach ($favoriteIds as $fileId) {
                $node = $userFolder->getFirstNodeById((int)$fileId);
                if ($node && $node->getType() === FileInfo::TYPE_FOLDER) {
                    $path = $node->getPath();
                    $prefix = '/' . $uid . '/files';
                    if (strpos($path, $prefix) === 0) {
                        $path = substr($path, strlen($prefix));
                    }
                    $path = ltrim($path, '/');
                    if ($path === '') {
                        $path = '/';
                    }
                    $favorites[] = $path;
                }
            }

            return new DataResponse(['success' => true, 'favorites' => $favorites]);
        } catch (\Throwable $e) {
            $this->logger->error('navigationFavorites EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function navigationToggleFavorite(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '/');
            $favorite = (bool)($payload['favorite'] ?? true);

            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $uid = $user->getUID();
            $userFolder = $this->rootFolder->getUserFolder($uid);

            $tagManager = $this->tagManager;
            $tags = $tagManager->load('files', [], false, $uid);
            if ($tags === null) {
                return new DataResponse(['success' => false, 'error' => 'Could not load tag manager'], 500);
            }

            try {
                $node = $userFolder->get($path);
                $fileId = $node->getId();
            } catch (\Throwable $e) {
                return new DataResponse(['success' => false, 'error' => 'Path not found: ' . $e->getMessage()], 404);
            }

            if ($favorite) {
                $tags->addToFavorites((int)$fileId);
            } else {
                $tags->removeFromFavorites((int)$fileId);
            }

            return new DataResponse(['success' => true, 'favorites' => $favorite ? 'added' : 'removed']);
        } catch (\Throwable $e) {
            $this->logger->error('navigationToggleFavorite EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function listLibraries(): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $libraries = $this->libraryMapper->findAll();
            $result = array_map(function($lib) {
                return [
                    'id' => $lib->getId(),
                    'name' => $lib->getName(),
                    'description' => $lib->getDescription(),
                    'userId' => $lib->getUserId(),
                    'createdAt' => $lib->getCreatedAt() ? $lib->getCreatedAt()->format('Y-m-d H:i:s') : null,
                    'updatedAt' => $lib->getUpdatedAt() ? $lib->getUpdatedAt()->format('Y-m-d H:i:s') : null,
                ];
            }, $libraries);
            return new DataResponse(['success' => true, 'libraries' => $result]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function createLibrary(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $library = new \OCA\Renamer\Db\Library();
            $library->setUserId($userId);
            $library->setName($payload['name']);
            $library->setDescription($payload['description'] ?? '');
            $library = $this->libraryMapper->insert($library);
            return new DataResponse(['success' => true, 'library' => [
                'id' => $library->getId(),
                'name' => $library->getName(),
                'description' => $library->getDescription(),
                'createdAt' => $library->getCreatedAt() ? $library->getCreatedAt()->format('Y-m-d H:i:s') : null,
                'updatedAt' => $library->getUpdatedAt() ? $library->getUpdatedAt()->format('Y-m-d H:i:s') : null,
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function updateLibrary(int $id): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $library = $this->libraryMapper->find($id, $userId);
            if (!$library) {
                return new DataResponse(['success' => false, 'error' => 'Library not found'], 404);
            }
            $library->setName($payload['name']);
            $library->setDescription($payload['description'] ?? '');
            $library = $this->libraryMapper->update($library);
            return new DataResponse(['success' => true, 'library' => [
                'id' => $library->getId(),
                'name' => $library->getName(),
                'description' => $library->getDescription(),
                'createdAt' => $library->getCreatedAt() ? $library->getCreatedAt()->format('Y-m-d H:i:s') : null,
                'updatedAt' => $library->getUpdatedAt() ? $library->getUpdatedAt()->format('Y-m-d H:i:s') : null,
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function deleteLibrary(int $id): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $library = $this->libraryMapper->find($id, $userId);
            if (!$library) {
                return new DataResponse(['success' => false, 'error' => 'Library not found'], 404);
            }
            $this->libraryMapper->delete($library);
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function listCollections(): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $libraryId = isset($_GET['libraryId']) ? (int)$_GET['libraryId'] : null;
            if ($libraryId === null) {
                return new DataResponse(['success' => false, 'error' => 'libraryId required'], 400);
            }
            $collections = $this->collectionMapper->findByLibraryId($libraryId);
            $result = array_map(function($col) {
                return [
                    'id' => $col->getId(),
                    'libraryId' => $col->getLibraryId(),
                    'name' => $col->getName(),
                    'description' => $col->getDescription(),
                    'userId' => $col->getUserId(),
                    'rules' => $col->getRulesArray(),
                    'createdAt' => $col->getCreatedAt() ? $col->getCreatedAt()->format('Y-m-d H:i:s') : null,
                    'updatedAt' => $col->getUpdatedAt() ? $col->getUpdatedAt()->format('Y-m-d H:i:s') : null,
                ];
            }, $collections);
            return new DataResponse(['success' => true, 'collections' => $result]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function createCollection(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name']) || empty($payload['libraryId'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $library = $this->libraryMapper->find((int)$payload['libraryId'], $userId);
            if (!$library) {
                return new DataResponse(['success' => false, 'error' => 'Library not found'], 404);
            }
            $collection = new \OCA\Renamer\Db\Collection();
            $collection->setUserId($userId);
            $collection->setLibraryId((int)$payload['libraryId']);
            $collection->setName($payload['name']);
            $collection->setDescription($payload['description'] ?? '');
            $collection->setRulesArray($payload['rules'] ?? []);
            $collection = $this->collectionMapper->insert($collection);
            return new DataResponse(['success' => true, 'collection' => [
                'id' => $collection->getId(),
                'libraryId' => $collection->getLibraryId(),
                'name' => $collection->getName(),
                'description' => $collection->getDescription(),
                'rules' => $collection->getRulesArray(),
                'createdAt' => $collection->getCreatedAt() ? $collection->getCreatedAt()->format('Y-m-d H:i:s') : null,
                'updatedAt' => $collection->getUpdatedAt() ? $collection->getUpdatedAt()->format('Y-m-d H:i:s') : null,
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function updateCollection(int $id): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $collection = $this->collectionMapper->find($id, $userId);
            if (!$collection) {
                return new DataResponse(['success' => false, 'error' => 'Collection not found'], 404);
            }
            $collection->setName($payload['name']);
            $collection->setDescription($payload['description'] ?? '');
            $collection->setRulesArray($payload['rules'] ?? []);
            $collection = $this->collectionMapper->update($collection);
            return new DataResponse(['success' => true, 'collection' => [
                'id' => $collection->getId(),
                'libraryId' => $collection->getLibraryId(),
                'name' => $collection->getName(),
                'description' => $collection->getDescription(),
                'rules' => $collection->getRulesArray(),
                'createdAt' => $collection->getCreatedAt() ? $collection->getCreatedAt()->format('Y-m-d H:i:s') : null,
                'updatedAt' => $collection->getUpdatedAt() ? $collection->getUpdatedAt()->format('Y-m-d H:i:s') : null,
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @AdminRequired
     */
    public function deleteCollection(int $id): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $collection = $this->collectionMapper->find($id, $userId);
            if (!$collection) {
                return new DataResponse(['success' => false, 'error' => 'Collection not found'], 404);
            }
            $this->collectionMapper->delete($collection);
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function convertCbrToCbz(): Response {
        $this->logger->debug('convertCbrToCbz ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['path'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $path = ltrim((string)$payload['path'], '');
            if ($path === '') {
                return new DataResponse(['success' => false, 'error' => 'No path'], 400);
            }

            $user = $this->userSession->getUser();
            if ($user === null) {
                return new DataResponse(['success' => false, 'error' => 'No user session'], 401);
            }
            $ownerUid = isset($payload['ownerUid']) && $payload['ownerUid'] !== '' ? (string)$payload['ownerUid'] : null;
            $uid = $ownerUid ?? $user->getUID();

            $unrarPath = trim((string)shell_exec('which unrar 2>/dev/null'));
            if ($unrarPath === '') {
                $this->logger->info('convertCbrToCbz: unrar not available on server', ['app' => 'renamer', 'path' => $path]);
                return new DataResponse([
                    'success' => false,
                    'error' => 'unrar not available on server',
                    'unavailable' => true,
                ]);
            }

            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                $node = $userFolder->get(ltrim($path, '/'));
            } catch (\Throwable $e) {
                return new DataResponse(['success' => false, 'error' => 'File not found: ' . $e->getMessage()], 404);
            }
            if (!$node instanceof File) {
                return new DataResponse(['success' => false, 'error' => 'Not a file'], 400);
            }
            if (!$node->isReadable()) {
                return new DataResponse(['success' => false, 'error' => 'Not readable'], 403);
            }

            $tempDir = sys_get_temp_dir() . '/renamer_cbr_' . uniqid();
            if (!mkdir($tempDir, 0777, true) && !is_dir($tempDir)) {
                return new DataResponse(['success' => false, 'error' => 'Cannot create temp directory'], 500);
            }

            $tempRar = $tempDir . '/input.cbr';
            $stream = $node->fopen('rb');
            $tempStream = fopen($tempRar, 'wb');
            if ($tempStream === false) {
                fclose($stream);
                $this->cleanupTempDir($tempDir);
                return new DataResponse(['success' => false, 'error' => 'Cannot create temp file'], 500);
            }
            stream_copy_to_stream($stream, $tempStream);
            fclose($stream);
            fclose($tempStream);

            $extractDir = $tempDir . '/extracted';
            mkdir($extractDir, 0777, true);

            $cmd = escapeshellarg($unrarPath) . ' x -o+ ' . escapeshellarg($tempRar) . ' ' . escapeshellarg($extractDir . '/') . ' 2>&1';
            $output = shell_exec($cmd);
            $this->logger->debug('convertCbrToCbz: unrar output: ' . (string)$output, ['app' => 'renamer']);

            $zipPath = $tempDir . '/output.cbz';
            $zip = new \ZipArchive();
            if (!$zip->open($zipPath, \ZIPARCHIVE::CREATE | \ZIPARCHIVE::OVERWRITE)) {
                $this->cleanupTempDir($tempDir);
                return new DataResponse(['success' => false, 'error' => 'Cannot create ZIP archive'], 500);
            }

            $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            $imageFiles = [];
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($extractDir, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $ext = strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION));
                    if (in_array($ext, $imageExtensions)) {
                        $imageFiles[] = $file->getPathname();
                    }
                }
            }

            sort($imageFiles);

            if (empty($imageFiles)) {
                $zip->close();
                $this->cleanupTempDir($tempDir);
                return new DataResponse(['success' => false, 'error' => 'No images found in CBR archive'], 400);
            }

            foreach ($imageFiles as $imageFile) {
                $zip->addFile($imageFile, basename($imageFile));
            }

            $zip->close();

            $response = new StreamResponse($zipPath, 200, [
                'Content-Type' => 'application/zip',
                'Content-Length' => (string) filesize($zipPath),
            ]);
            register_shutdown_function([$this, 'cleanupTempDir'], $tempDir);
            return $response;
        } catch (\Throwable $e) {
            $this->logger->error('convertCbrToCbz EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    private function cleanupTempDir(string $dir): void {
        if (!is_dir($dir)) return;
        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($files as $file) {
            if ($file->isDir()) {
                rmdir($file->getPathname());
            } else {
                unlink($file->getPathname());
            }
        }
        rmdir($dir);
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     */
    public function coverBlob(string $hash): Response {
        $hash = (string) $hash;
        if ($hash === '' || preg_match('/^[a-f0-9]{40}$/', $hash) !== 1) {
            return new DataResponse(['success' => false, 'error' => 'Invalid hash'], 400);
        }
        $blobPath = $this->coverService->coverBlobPath($hash);
        if ($blobPath === null || !is_file($blobPath)) {
            return new DataResponse(['success' => false, 'error' => 'Cover not found'], 404);
        }
        $etag = substr(basename($blobPath), 0, -4);
        if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === '"' . $etag . '"') {
            return new StreamResponse('', 304, [
                'ETag' => '"' . $etag . '"',
                'Cache-Control' => 'public, max-age=86400',
            ]);
        }
        $stream = @fopen($blobPath, 'rb');
        if ($stream === false) {
            return new DataResponse(['success' => false, 'error' => 'Cannot read cover blob'], 500);
        }
        return new StreamResponse($stream, 200, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'public, max-age=86400',
            'ETag' => '"' . $etag . '"',
        ]);
    }

    /**
     * @NoCSRFRequired
     * @NoAdminRequired
     *
     * Bulk : renvoie { covers: { path: coverUrl|null }, missing: [path] }
     * pour tous les tomes visibles. Le frontend remplit state.covers en un seul
     * appel (évite le thundering herd).
     *
     * Body POST : { paths: string[], width: int? }
     */
    public function coversList(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode((string) $content, true);
            if (!is_array($payload) || empty($payload['paths'])) {
                return new DataResponse(['success' => false, 'error' => 'paths required'], 400);
            }
            $paths = array_values($payload['paths']);
            $width = isset($payload['width']) ? (int) $payload['width'] : 300;
            $result = $this->coverService->getCovers($paths, $width);
            $this->logger->info('coversList: paths=' . count($paths) . ' resolved=' . count(array_filter($result['covers'], fn($u) => $u !== null)) . ' missing=' . count($result['missing']), ['app' => 'renamer']);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('coversList EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer']);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
