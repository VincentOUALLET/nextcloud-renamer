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

class PageController extends Controller {
    private LoggerInterface $logger;
    private RuleService $ruleService;
    private RenameService $renameService;
    private PreviewService $previewService;
    private MetadataService $metadataService;

    public function __construct(string $appName, IRequest $request, LoggerInterface $logger, RuleService $ruleService, RenameService $renameService, PreviewService $previewService, MetadataService $metadataService) {
        parent::__construct($appName, $request);
        $this->logger = $logger;
        $this->ruleService = $ruleService;
        $this->renameService = $renameService;
        $this->previewService = $previewService;
        $this->metadataService = $metadataService;
    }

    /**
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        $this->logger->debug('index() called', ['app' => 'renamer']);
        \OCP\Util::addScript('renamer', 'rename');
        return new TemplateResponse('renamer', 'main', []);
    }

    /**
     * @NoCSRFRequired
     */
    public function metadataPreview(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['paths']) || !is_array($payload['paths']) || empty($payload['format'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $paths = $payload['paths'];
            $format = (string)$payload['format'];
            $result = $this->metadataService->generate($paths, $format);

            return new DataResponse(['success' => true, 'preview' => $result]);
        } catch (\Throwable $e) {
            $this->logger->error('metadataPreview exception: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
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
        $this->logger->info('doRename START', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload)) {
                $payload = [];
            }
            $paths = isset($payload['paths']) && is_array($payload['paths']) ? $payload['paths'] : [];
            $mode = isset($payload['mode']) ? (string)$payload['mode'] : 'regex';
            $pattern = isset($payload['pattern']) ? (string)$payload['pattern'] : '';
            $replacement = isset($payload['replacement']) ? (string)$payload['replacement'] : '';
            $dryRun = !empty($payload['dryRun']);
            $dev = !empty($payload['dev']);
            $increment = !empty($payload['increment']);
            $incSep = isset($payload['incSep']) ? (string)$payload['incSep'] : ' - ';
            $incFormat = isset($payload['incFormat']) ? (string)$payload['incFormat'] : '{name}{sep}{i}';
            $this->logger->info('rename payload', ['app' => 'renamer', 'paths' => $paths, 'mode' => $mode, 'dryRun' => $dryRun ? '1' : '0', 'dev' => $dev ? '1' : '0', 'increment' => $increment ? '1' : '0']);

            if ($dev) {
                $preview = $this->previewService->generate($paths, $mode, $pattern, $replacement, true, $increment, $incSep, $incFormat);
                return new DataResponse([
                    'success' => true,
                    'renamed' => [],
                    'skipped' => [],
                    'errors' => [],
                    'preview' => $preview,
                    'dev' => true,
                ]);
            }

            $result = $this->renameService->execute($paths, $mode, $pattern, $replacement, $dryRun, $increment, $incSep, $incFormat);
            $this->logger->info('doRename END', ['app' => 'renamer']);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('doRename EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse([
                'success' => false,
                'renamed' => [],
                'skipped' => [],
                'errors' => ['Internal error: ' . $e->getMessage()]
            ]);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function rules(): Response {
        try {
            $this->logger->debug('rules() called', ['app' => 'renamer']);
            $userRules = $this->ruleService->listUserRules();
            $defaultRules = $this->ruleService->listDefaultRules();

            $formatRules = function($rules) {
                return array_map(function($r) {
                    return [
                        'id' => $r->getId(),
                        'name' => $r->getName(),
                        'mode' => $r->getMode(),
                        'pattern' => $r->getPattern(),
                        'replacement' => $r->getReplacement(),
                        'isDefault' => $r->isDefault(),
                    ];
                }, $rules);
            };

            return new DataResponse([
                'user' => $formatRules($userRules),
                'defaults' => $formatRules($defaultRules),
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('rules() exception: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function createRule(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name']) || !isset($payload['mode']) || !isset($payload['pattern']) || !isset($payload['replacement'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $rule = $this->ruleService->createRule(
                (string)$payload['name'],
                (string)$payload['mode'],
                (string)$payload['pattern'],
                (string)$payload['replacement']
            );

            return new DataResponse([
                'id' => $rule->getId(),
                'name' => $rule->getName(),
                'mode' => $rule->getMode(),
                'pattern' => $rule->getPattern(),
                'replacement' => $rule->getReplacement(),
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('createRule exception: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function updateRule(int $id): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['name']) || !isset($payload['mode']) || !isset($payload['pattern']) || !isset($payload['replacement'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $rule = $this->ruleService->updateRule(
                $id,
                (string)$payload['name'],
                (string)$payload['mode'],
                (string)$payload['pattern'],
                (string)$payload['replacement']
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
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('updateRule exception: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function deleteRule(int $id): Response {
        try {
            $this->ruleService->deleteRule($id);
            return new DataResponse(['success' => true]);
        } catch (\Throwable $e) {
            $this->logger->error('deleteRule exception: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function importRules(): Response {
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['rules']) || !is_array($payload['rules'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }

            $result = $this->ruleService->importRules($payload['rules']);
            return new DataResponse($result);
        } catch (\Throwable $e) {
            $this->logger->error('importRules exception: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * @NoCSRFRequired
     */
    public function exportRules(): Response {
        try {
            $rules = $this->ruleService->exportRules();
            return new DataResponse(['rules' => $rules]);
        } catch (\Throwable $e) {
            $this->logger->error('exportRules exception: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return new DataResponse(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
