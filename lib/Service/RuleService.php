<?php

namespace OCA\Renamer\Service;

use OCA\Renamer\Db\Rule;
use OCA\Renamer\Db\RuleMapper;
use Psr\Log\LoggerInterface;
use OCP\IUserSession;

class RuleService {
    private LoggerInterface $logger;
    private RuleMapper $mapper;
    private IUserSession $userSession;

    private const DEFAULT_RULES = [
        ['CamelCase', 'camelcase', '', '', 'full', null, 1, 0, true, 'ignored', null],
        ['snake_case', 'snakecase', '', '', 'full', null, 1, 0, true, 'ignored', null],
        ['Remove spaces', 'removespaces', '', '', 'full', null, 1, 0, true, 'ignored', null],
        ['Capitalize first', 'capitalizefirst', '', '', 'full', null, 1, 0, true, 'ignored', null],
        ['Capitalize words', 'capitalizewords', '', '', 'full', null, 1, 0, true, 'ignored', null],
    ];

    public function __construct(LoggerInterface $logger, RuleMapper $mapper, IUserSession $userSession) {
        $this->logger = $logger;
        $this->mapper = $mapper;
        $this->userSession = $userSession;
        $this->logger->debug('RuleService constructed', ['app' => 'renamer']);
    }

    public function listUserRules(): array {
        $user = $this->userSession->getUser();
        if ($user === null) {
            $this->logger->debug('listUserRules no user', ['app' => 'renamer']);
            return [];
        }
        $this->logger->debug('listUserRules uid=' . $user->getUID(), ['app' => 'renamer']);
        return $this->mapper->findByUserId($user->getUID());
    }

    public function listMetadataRules(): array {
        $user = $this->userSession->getUser();
        if ($user === null) {
            $this->logger->debug('listMetadataRules no user', ['app' => 'renamer']);
            return [];
        }
        $this->logger->debug('listMetadataRules uid=' . $user->getUID(), ['app' => 'renamer']);
        return $this->mapper->findByUserIdAndScope($user->getUID(), 'metadata');
    }

    public function listDefaultRules(): array {
        $this->logger->debug('listDefaultRules trying DB', ['app' => 'renamer']);
        try {
            $dbDefaults = $this->mapper->findDefaultRules();
            $this->logger->debug('listDefaultRules DB returned ' . count($dbDefaults), ['app' => 'renamer']);
            if (!empty($dbDefaults)) {
                return $dbDefaults;
            }
        } catch (\Throwable $e) {
            $this->logger->debug('listDefaultRules DB failed: ' . $e->getMessage(), ['app' => 'renamer']);
        }
        $this->logger->debug('listDefaultRules using hardcoded', ['app' => 'renamer']);
        return $this->hardcodedDefaults();
    }

    private function hardcodedDefaults(): array {
        $defaults = [];
        foreach (self::DEFAULT_RULES as $row) {
            $rule = new Rule();
            $rule->setName($row[0]);
            $rule->setMode($row[1]);
            $rule->setPattern($row[2]);
            $rule->setReplacement($row[3]);
            $rule->setTarget($row[4]);
            $rule->setSequenceType($row[5]);
            $rule->setStartValue($row[6]);
            $rule->setZeroPadding($row[7]);
            $rule->setEnabled($row[8]);
            $rule->setFilterMode($row[9]);
            $rule->setExtensions($row[10]);
            $rule->setIsDefault(true);
            $defaults[] = $rule;
        }
        return $defaults;
    }

    public function getRule(int $id): ?Rule {
        return $this->mapper->find($id);
    }

    public function createRule(string $name, string $mode, string $pattern, string $replacement, string $target = 'full', ?string $sequenceType = null, ?int $startValue = 1, int $zeroPadding = 0, bool $enabled = true, ?string $filterMode = 'ignored', ?string $extensions = null, string $scope = 'advanced', string $metadataField = ''): Rule {
        $user = $this->userSession->getUser();
        $userId = $user ? $user->getUID() : '';
        $this->logger->debug('createRule name=' . $name . ' mode=' . $mode . ' scope=' . $scope, ['app' => 'renamer']);

        $rule = new Rule();
        $rule->setName($name);
        $rule->setMode($mode);
        $rule->setPattern($pattern);
        $rule->setReplacement($replacement);
        $rule->setTarget($target);
        $rule->setSequenceType($sequenceType);
        $rule->setStartValue($startValue);
        $rule->setZeroPadding($zeroPadding);
        $rule->setEnabled($enabled);
        $rule->setFilterMode($filterMode);
        $rule->setExtensions($extensions);
        $rule->setScope($scope);
        $rule->setMetadataField($metadataField);
        $rule->setIsDefault(false);
        $rule->setUserId($userId);
        $rule->setCreatedAt(new \DateTime());

        $inserted = $this->mapper->insert($rule);
        $this->logger->debug('createRule inserted id=' . $inserted->getId(), ['app' => 'renamer']);
        return $inserted;
    }

    public function createMetadataRule(string $name, string $mode, string $pattern, string $replacement, string $metadataField, string $target = 'full', ?string $sequenceType = null, ?int $startValue = 1, int $zeroPadding = 0, bool $enabled = true): Rule {
        return $this->createRule($name, $mode, $pattern, $replacement, $target, $sequenceType, $startValue, $zeroPadding, $enabled, 'ignored', null, 'metadata', $metadataField);
    }

    public function updateRule(int $id, string $name, string $mode, string $pattern, string $replacement, string $target = 'full', ?string $sequenceType = null, ?int $startValue = 1, int $zeroPadding = 0, bool $enabled = true, ?string $filterMode = 'ignored', ?string $extensions = null, string $scope = 'advanced', string $metadataField = ''): ?Rule {
        $this->logger->debug('updateRule id=' . $id, ['app' => 'renamer']);
        $rule = $this->mapper->find($id);
        if (!$rule) {
            $this->logger->debug('updateRule not found', ['app' => 'renamer']);
            return null;
        }

        $rule->setName($name);
        $rule->setMode($mode);
        $rule->setPattern($pattern);
        $rule->setReplacement($replacement);
        $rule->setTarget($target);
        $rule->setSequenceType($sequenceType);
        $rule->setStartValue($startValue);
        $rule->setZeroPadding($zeroPadding);
        $rule->setEnabled($enabled);
        $rule->setFilterMode($filterMode);
        $rule->setExtensions($extensions);
        $rule->setScope($scope);
        $rule->setMetadataField($metadataField);

        $updated = $this->mapper->update($rule);
        $this->logger->debug('updateRule updated id=' . $updated->getId(), ['app' => 'renamer']);
        return $updated;
    }

    public function updateMetadataRule(int $id, string $name, string $mode, string $pattern, string $replacement, string $metadataField, string $target = 'full', ?string $sequenceType = null, ?int $startValue = 1, int $zeroPadding = 0, bool $enabled = true): ?Rule {
        return $this->updateRule($id, $name, $mode, $pattern, $replacement, $target, $sequenceType, $startValue, $zeroPadding, $enabled, 'ignored', null, 'metadata', $metadataField);
    }

    public function deleteRule(int $id): void {
        $this->logger->debug('deleteRule id=' . $id, ['app' => 'renamer']);
        $rule = $this->mapper->find($id);
        if ($rule) {
            $this->mapper->delete($rule);
            $this->logger->debug('deleteRule deleted', ['app' => 'renamer']);
        }
    }

    /**
     * @return array{name: string, mode: string, pattern: string, replacement: string, target: string, sequenceType: string|null, startValue: int, zeroPadding: int, enabled: bool, filterMode: string, extensions: string[]}[]
     */
    public function exportRules(): array {
        $user = $this->userSession->getUser();
        $uid = $user ? $user->getUID() : '';
        $this->logger->debug('exportRules uid=' . $uid, ['app' => 'renamer']);
        $rules = $this->mapper->findByUserId($uid);

        return array_map(function (Rule $r) {
            return [
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
                'scope' => $r->getScope(),
                'metadataField' => $r->getMetadataField(),
            ];
        }, $rules);
    }

    /**
     * @param array{name: string, mode: string, pattern: string, replacement: string, target?: string, sequenceType?: string|null, startValue?: int, zeroPadding?: int, enabled?: bool, filterMode?: string, extensions?: string[], scope?: string, metadataField?: string}[]
     */
    public function importRules(array $rules): array {
        $user = $this->userSession->getUser();
        $userId = $user ? $user->getUID() : '';
        $this->logger->debug('importRules uid=' . $userId . ' count=' . count($rules), ['app' => 'renamer']);
        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rules as $data) {
            if (empty($data['name']) || !isset($data['mode']) || !isset($data['pattern']) || !isset($data['replacement'])) {
                $skipped++;
                $errors[] = 'Invalid rule data: ' . json_encode($data);
                continue;
            }

            $scope = $data['scope'] ?? 'advanced';
            $metadataField = $data['metadataField'] ?? '';

            $existing = $this->mapper->findByName($data['name']);
            if ($existing && $existing->getUserId() === $userId) {
                $existing->setMode($data['mode']);
                $existing->setPattern($data['pattern']);
                $existing->setReplacement($data['replacement']);
                $existing->setTarget($data['target'] ?? 'full');
                $existing->setSequenceType($data['sequenceType'] ?? null);
                $existing->setStartValue($data['startValue'] ?? 1);
                $existing->setZeroPadding($data['zeroPadding'] ?? 0);
                $existing->setEnabled($data['enabled'] ?? true);
                $existing->setFilterMode($data['filterMode'] ?? 'ignored');
                $existing->setExtensionsArray($data['extensions'] ?? []);
                $existing->setScope($scope);
                $existing->setMetadataField($metadataField);
                $this->mapper->update($existing);
            } else {
                $rule = new Rule();
                $rule->setName($data['name']);
                $rule->setMode($data['mode']);
                $rule->setPattern($data['pattern']);
                $rule->setReplacement($data['replacement']);
                $rule->setTarget($data['target'] ?? 'full');
                $rule->setSequenceType($data['sequenceType'] ?? null);
                $rule->setStartValue($data['startValue'] ?? 1);
                $rule->setZeroPadding($data['zeroPadding'] ?? 0);
                $rule->setEnabled($data['enabled'] ?? true);
                $rule->setFilterMode($data['filterMode'] ?? 'ignored');
                $rule->setExtensionsArray($data['extensions'] ?? []);
                $rule->setScope($scope);
                $rule->setMetadataField($metadataField);
                $rule->setUserId($userId);
                $this->mapper->insert($rule);
            }
            $imported++;
        }

        $this->logger->debug('importRules done imported=' . $imported . ' skipped=' . $skipped, ['app' => 'renamer']);
        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }
}
