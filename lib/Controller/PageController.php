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
use OCP\IUserSession;

class PageController extends Controller {
    private LoggerInterface $logger;
    private RuleService $ruleService;
    private RenameService $renameService;
    private PreviewService $previewService;
    private MetadataService $metadataService;
    private PdfService $pdfService;
    private IUserSession $userSession;

    public function __construct(string $appName, IRequest $request, LoggerInterface $logger, RuleService $ruleService, RenameService $renameService, PreviewService $previewService, MetadataService $metadataService, PdfService $pdfService, IUserSession $userSession) {
        parent::__construct($appName, $request);
        $this->logger = $logger;
        $this->ruleService = $ruleService;
        $this->renameService = $renameService;
        $this->previewService = $previewService;
        $this->metadataService = $metadataService;
        $this->pdfService = $pdfService;
        $this->userSession = $userSession;
    }

    /**
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        $this->logger->debug('index() called', ['app' => 'renamer']);
        \OCP\Util::addScript('renamer', 'utils');
        \OCP\Util::addScript('renamer', 'Sortable.min');
        \OCP\Util::addScript('renamer', 'app');
        \OCP\Util::addScript('renamer', 'app-pdf');
        \OCP\Util::addScript('renamer', 'app-metadata');
        \OCP\Util::addScript('renamer', 'rename');
        $this->logger->debug('index() scripts registered, app-metadata added', ['app' => 'renamer']);
        $response = new TemplateResponse('renamer', 'main', []);
        $this->logger->debug('index() returning TemplateResponse', ['app' => 'renamer']);
        return $response;
    }

    public function metadataRead(): Response {
        $this->logger->debug('metadataRead ENTRY', ['app' => 'renamer']);
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

                $meta = $this->metadataService->getMetadata($cleanPath);
                $writable = $this->metadataService->isWritableFormat($cleanPath);
                $result[] = [
                    'path' => $cleanPath,
                    'metadata' => $meta,
                    'writable' => $writable,
                ];
            }

            return new DataResponse(['success' => true, 'files' => $result]);
        } catch (\Throwable $e) {
            $this->logger->error('metadataRead EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

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
    public function pdfConvertCbz(): Response {
        $this->logger->info('pdfConvertCbz ENTRY', ['app' => 'renamer']);
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
            
            $sql = "INSERT INTO " . $tableName . " (user_id, translation_key, language, translated_text) VALUES (?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text), updated_at = CURRENT_TIMESTAMP";
            $connection->executeStatement($sql, [$userId, $payload['translationKey'], $language, $payload['translatedText']]);
            
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('saveTranslation EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
