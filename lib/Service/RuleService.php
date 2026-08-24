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
        ['camelCase', 'camelcase', '', ''],
        ['snake_case', 'snakecase', '', ''],
        ['Remove spaces', 'removespaces', '', ''],
        ['Capitalize first', 'capitalizefirst', '', ''],
        ['Capitalize words', 'capitalizewords', '', ''],
    ];

    public function __construct(LoggerInterface $logger, RuleMapper $mapper, IUserSession $userSession) {
        $this->logger = $logger;
        $this->mapper = $mapper;
        $this->userSession = $userSession;
    }

    public function listUserRules(): array {
        $user = $this->userSession->getUser();
        if ($user === null) {
            return [];
        }
        return $this->mapper->findByUserId($user->getUID());
    }

    public function listDefaultRules(): array {
        try {
            $dbDefaults = $this->mapper->findDefaultRules();
            if (!empty($dbDefaults)) {
                return $dbDefaults;
            }
        } catch (\Throwable $e) {
            $this->logger->debug('No default rules table yet, using hardcoded defaults', ['app' => 'renamer']);
        }
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
            $rule->setIsDefault(true);
            $defaults[] = $rule;
        }
        return $defaults;
    }

    public function getRule(int $id): ?Rule {
        return $this->mapper->find($id);
    }

    public function createRule(string $name, string $mode, string $pattern, string $replacement, bool $isDefault = false): Rule {
        $user = $this->userSession->getUser();
        $userId = $user ? $user->getUID() : '';

        $rule = new Rule();
        $rule->setName($name);
        $rule->setMode($mode);
        $rule->setPattern($pattern);
        $rule->setReplacement($replacement);
        $rule->setIsDefault($isDefault);
        $rule->setUserId($userId);

        return $this->mapper->insert($rule);
    }

    public function updateRule(int $id, string $name, string $mode, string $pattern, string $replacement): ?Rule {
        $rule = $this->mapper->find($id);
        if (!$rule) {
            return null;
        }

        $rule->setName($name);
        $rule->setMode($mode);
        $rule->setPattern($pattern);
        $rule->setReplacement($replacement);

        return $this->mapper->update($rule);
    }

    public function deleteRule(int $id): void {
        $rule = $this->mapper->find($id);
        if ($rule) {
            $this->mapper->delete($rule);
        }
    }

    /**
     * @return array{name: string, mode: string, pattern: string, replacement: string}[]
     */
    public function exportRules(): array {
        $user = $this->userSession->getUser();
        $rules = $this->mapper->findByUserId($user ? $user->getUID() : '');

        return array_map(function (Rule $r) {
            return [
                'name' => $r->getName(),
                'mode' => $r->getMode(),
                'pattern' => $r->getPattern(),
                'replacement' => $r->getReplacement(),
            ];
        }, $rules);
    }

    /**
     * @param array{name: string, mode: string, pattern: string, replacement: string}[] $rules
     */
    public function importRules(array $rules): array {
        $user = $this->userSession->getUser();
        $userId = $user ? $user->getUID() : '';
        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rules as $data) {
            if (empty($data['name']) || !isset($data['mode']) || !isset($data['pattern']) || !isset($data['replacement'])) {
                $skipped++;
                $errors[] = 'Invalid rule data: ' . json_encode($data);
                continue;
            }

            $existing = $this->mapper->findByName($data['name']);
            if ($existing && $existing->getUserId() === $userId) {
                $existing->setMode($data['mode']);
                $existing->setPattern($data['pattern']);
                $existing->setReplacement($data['replacement']);
                $this->mapper->update($existing);
            } else {
                $rule = new Rule();
                $rule->setName($data['name']);
                $rule->setMode($data['mode']);
                $rule->setPattern($data['pattern']);
                $rule->setReplacement($data['replacement']);
                $rule->setUserId($userId);
                $this->mapper->insert($rule);
            }
            $imported++;
        }

        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }
}
