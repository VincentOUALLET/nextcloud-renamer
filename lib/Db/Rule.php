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

    /** @var \DateTime|null */
    protected $createdAt;

    public function getFieldTypes(): array {
        return [
            'id' => 'integer',
            'name' => 'string',
            'mode' => 'string',
            'pattern' => 'string',
            'replacement' => 'string',
            'isDefault' => 'bool',
            'userId' => 'string',
            'createdAt' => 'datetime',
        ];
    }

    public function getCreatedAt(): ?\DateTime {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTime $createdAt): void {
        $this->createdAt = $createdAt;
    }

    public function isDefault(): bool {
        return (bool)$this->isDefault;
    }
}
