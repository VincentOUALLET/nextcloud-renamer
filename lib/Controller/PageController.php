<?php

namespace OCA\Renamer\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
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
use OCP\IUserSession;
use OCP\Files\IRootFolder;
use OCP\Files\File;

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

    public function __construct(string $appName, IRequest $request, LoggerInterface $logger, RuleService $ruleService, RenameService $renameService, PreviewService $previewService, MetadataService $metadataService, PdfService $pdfService, IUserSession $userSession, IRootFolder $rootFolder, LibraryMapper $libraryMapper, CollectionMapper $collectionMapper) {
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
    }

    /**
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        $this->logger->debug('index() called', ['app' => 'renamer']);
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
        \OCP\Util::addScript('renamer', 'tabs/pdf/pdf-viewer');
        \OCP\Util::addScript('renamer', 'tabs/pdf/cbz-viewer');
        \OCP\Util::addScript('renamer', 'tabs/pdf/image-viewer');
        \OCP\Util::addScript('renamer', 'tabs/pdf/epub-viewer');
        \OCP\Util::addScript('renamer', 'tabs/pdf/reader');
        \OCP\Util::addScript('renamer', 'tabs/reader/app-reader');
        $this->logger->debug('index() scripts registered, app-metadata added', ['app' => 'renamer']);
        $response = new TemplateResponse('renamer', 'main', []);
        $this->logger->debug('index() returning TemplateResponse', ['app' => 'renamer']);
        return $response;
    }

    /**
     * @NoCSRFRequired
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
            $conflictMode = $payload['conflictMode'] ?? 'overwrite';

            $updated = [];
            $skipped = [];
            $errors = [];

            foreach ($paths as $path) {
                $cleanPath = ltrim((string)$path, '/');
                if ($cleanPath === '') {
                    continue;
                }

                $hasManualOverride = isset($manualOverrides[$cleanPath]) && is_array($manualOverrides[$cleanPath]);
                if ($hasManualOverride && $conflictMode === 'ignore') {
                    $skipped[] = $cleanPath . ' (manual override kept)';
                    continue;
                }

                $currentMeta = $this->metadataService->getMetadata($cleanPath);
                if ($currentMeta === null) {
                    $skipped[] = $cleanPath . ' (no metadata or unsupported format)';
                    continue;
                }

                $originalMeta = $hasManualOverride ? ($manualOverrides[$cleanPath] ?? $currentMeta) : $currentMeta;
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
            $uid = $user->getUID();
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
            $content = stream_get_contents($stream);
            fclose($stream);

            return new DataResponse(['success' => true, 'content' => base64_encode($content)]);
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
            $uid = $user->getUID();
            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                $folder = $userFolder->get($path);
            } catch (\Throwable $e) {
                return new DataResponse(['error' => 'Folder not found: ' . $e->getMessage()], 404);
            }
            if (!$folder instanceof \OCP\Files\Folder) {
                return new DataResponse(['error' => 'Not a folder'], 400);
            }
            if (!$folder->isReadable()) {
                return new DataResponse(['error' => 'Not readable'], 403);
            }

            $supportedExtensions = ['pdf', 'cbz', 'cbr', 'epub', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
            $files = [];

            $iterator = function($dir, $relPath) use (&$iterator, $recursive, $supportedExtensions, &$files) {
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
                    if (in_array($ext, $supportedExtensions)) {
                        $files[] = [
                            'path' => '/' . ltrim($childRelPath, '/'),
                            'name' => $child->getName(),
                            'extension' => $ext,
                            'size' => $child->getSize(),
                            'mtime' => $child->getMTime(),
                        ];
                    }
                }
            };
            $iterator($folder, $path);

            return new DataResponse(['success' => true, 'files' => $files]);
        } catch (\Throwable $e) {
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
            return new DataResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function pdfConvertCbz(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true) ?: [];
            $paths = $payload['paths'] ?? [];
            if (!is_array($paths) || empty($paths)) {
                return new DataResponse(['success' => false, 'converted' => [], 'skipped' => [], 'errors' => ['No paths provided']], 400);
            }
            $result = $this->pdfService->convertToCbz($paths);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('pdfConvertCbz EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'converted' => [], 'skipped' => [], 'errors' => [$e->getMessage()]], 500);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function pdfPreview(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true) ?: [];
            $paths = $payload['paths'] ?? [];
            $thumbWidth = (int)($payload['thumbnailWidth'] ?? 150);

            if (!is_array($paths) || empty($paths)) {
                return new DataResponse(['success' => false, 'results' => [], 'errors' => ['No paths provided']], 400);
            }

            $result = $this->pdfService->previewPdf($paths, $thumbWidth);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('pdfPreview EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'results' => [], 'errors' => [$e->getMessage()]], 500);
        }
    }

    /**
     * @NoCSRFRequired
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

            $result = $this->pdfService->renderPage($path, $page, $width);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('pdfPage EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'path' => '', 'page' => 0, 'pageCount' => 0, 'dataUrl' => '', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
     */
    public function listLibraries(): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $libraries = $this->libraryMapper->findByUserId($userId);
            $result = array_map(function($lib) {
                return [
                    'id' => $lib->getId(),
                    'name' => $lib->getName(),
                    'description' => $lib->getDescription(),
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
                'createdAt' => $library->getCreatedAt()->format('Y-m-d H:i:s'),
                'updatedAt' => $library->getUpdatedAt()->format('Y-m-d H:i:s'),
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
                'createdAt' => $library->getCreatedAt()->format('Y-m-d H:i:s'),
                'updatedAt' => $library->getUpdatedAt()->format('Y-m-d H:i:s'),
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
     */
    public function listCollections(): Response {
        try {
            $user = $this->userSession->getUser();
            if (!$user) {
                return new DataResponse(['success' => false, 'error' => 'Not authenticated'], 401);
            }
            $userId = $user->getUID();
            $libraryId = isset($_GET['libraryId']) ? (int)$_GET['libraryId'] : null;
            if ($libraryId === null) {
                return new DataResponse(['success' => false, 'error' => 'libraryId required'], 400);
            }
            $collections = $this->collectionMapper->findByLibraryId($libraryId, $userId);
            $result = array_map(function($col) {
                return [
                    'id' => $col->getId(),
                    'libraryId' => $col->getLibraryId(),
                    'name' => $col->getName(),
                    'description' => $col->getDescription(),
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
                'createdAt' => $collection->getCreatedAt()->format('Y-m-d H:i:s'),
                'updatedAt' => $collection->getUpdatedAt()->format('Y-m-d H:i:s'),
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
                'createdAt' => $collection->getCreatedAt()->format('Y-m-d H:i:s'),
                'updatedAt' => $collection->getUpdatedAt()->format('Y-m-d H:i:s'),
            ]]);
        } catch (\Throwable $e) {
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
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
            $uid = $user->getUID();

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
            $content = stream_get_contents($stream);
            fclose($stream);
            file_put_contents($tempRar, $content);

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

            $cbzContent = file_get_contents($zipPath);
            $this->cleanupTempDir($tempDir);

            return new DataResponse([
                'success' => true,
                'content' => base64_encode($cbzContent),
            ]);
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
}
