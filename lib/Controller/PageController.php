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
        \OCP\Util::addScript('renamer', 'style');
        \OCP\Util::addScript('renamer', 'utils');
        \OCP\Util::addScript('renamer', 'app');
        \OCP\Util::addScript('renamer', 'rename');
        return new TemplateResponse('renamer', 'main', []);
    }

    /**
     * @NoCSRFRequired
     */
    public function metadataPreview(): Response {
        $this->logger->debug('metadataPreview ENTRY', ['app' => 'renamer']);
        try {
            $content = file_get_contents('php://input');
            $payload = json_decode($content, true);
            if (!is_array($payload) || empty($payload['paths']) || !is_array($payload['paths']) || empty($payload['format'])) {
                return new DataResponse(['success' => false, 'error' => 'Invalid payload'], 400);
            }
            $result = $this->metadataService->generate($payload['paths'], $payload['format']);
            return new DataResponse(['success' => true, 'preview' => $result]);
        } catch (\Throwable $e) {
            $this->logger->error('metadataPreview EXCEPTION: ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
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
                $payload['isDefault'] ?? false
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
                isset($payload['extensions']) && is_array($payload['extensions']) ? json_encode($payload['extensions']) : null
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
}
