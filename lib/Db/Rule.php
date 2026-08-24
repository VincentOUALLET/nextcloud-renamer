<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;
use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

class Rule extends Entity {
    /** @var string */
    protected $name;

    /** @var string */
    protected $mode;

    /** @var string */
    protected $pattern;

    /** @var string */
    protected $replacement;

    /** @var bool|null */
    protected $isDefault;

    /** @var string */
    protected $userId = '';

    public function __construct() {
        parent::__construct();
    }

    public function getName(): string {
        return (string)$this->name;
    }

    public function setName(string $name): void {
        $this->name = $name;
    }

    public function getMode(): string {
        return (string)$this->mode;
    }

    public function setMode(string $mode): void {
        $this->mode = $mode;
    }

    public function getPattern(): string {
        return (string)$this->pattern;
    }

    public function setPattern(string $pattern): void {
        $this->pattern = $pattern;
    }

    public function getReplacement(): string {
        return (string)$this->replacement;
    }

    public function setReplacement(string $replacement): void {
        $this->replacement = $replacement;
    }

    public function isDefault(): bool {
        return (bool)$this->isDefault;
    }

    public function setIsDefault(bool $isDefault): void {
        $this->isDefault = $isDefault;
    }

    public function getUserId(): string {
        return (string)$this->userId;
    }

    public function setUserId(string $userId): void {
        $this->userId = $userId;
    }

    public function getFieldTypes(): array {
        return [
            'id' => 'integer',
            'name' => 'string',
            'mode' => 'string',
            'pattern' => 'string',
            'replacement' => 'string',
            'isDefault' => 'bool',
            'userId' => 'string',
        ];
    }
}
