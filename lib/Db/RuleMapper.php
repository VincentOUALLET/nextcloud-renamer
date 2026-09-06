<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;
use OCP\AppFramework\Db\QBMapper;
use OCP\IDBConnection;

class RuleMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'renamer_rules', Rule::class);
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void {
        $sqlTable = '*PREFIX*renamer_rules';

        $this->db->executeStatement("CREATE TABLE IF NOT EXISTS `" . $sqlTable . "` (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL DEFAULT '',
            mode VARCHAR(50) NOT NULL DEFAULT 'replace',
            pattern VARCHAR(1000) DEFAULT '',
            replacement VARCHAR(1000) DEFAULT '',
            target VARCHAR(20) DEFAULT 'full',
            sequence_type VARCHAR(20) DEFAULT 'numeric',
            start_value INTEGER DEFAULT 1,
            zero_padding INTEGER DEFAULT 0,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            filter_mode VARCHAR(20) DEFAULT 'ignored',
            extensions TEXT,
            scope VARCHAR(20) DEFAULT 'advanced',
            metadata_field VARCHAR(20) DEFAULT '',
            is_default TINYINT(1) DEFAULT 0,
            user_id VARCHAR(255) DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $columnsToAdd = [
            'target' => 'VARCHAR(20) DEFAULT \'full\'',
            'sequence_type' => 'VARCHAR(20) DEFAULT \'numeric\'',
            'start_value' => 'INTEGER DEFAULT 1',
            'zero_padding' => 'INTEGER DEFAULT 0',
            'enabled' => 'TINYINT(1) NOT NULL DEFAULT 1',
            'filter_mode' => 'VARCHAR(20) DEFAULT \'ignored\'',
            'extensions' => 'TEXT',
            'scope' => 'VARCHAR(20) DEFAULT \'advanced\'',
            'metadata_field' => 'VARCHAR(20) DEFAULT \'\'',
        ];

        foreach ($columnsToAdd as $colName => $colDef) {
            try {
                $this->db->executeStatement(
                    "ALTER TABLE `" . $sqlTable . "` ADD COLUMN `" . $colName . "` " . $colDef
                );
            } catch (\Throwable $e) {
                // Column already exists or other error — ignore to keep ensureTableExists idempotent
            }
        }

        try {
            $this->db->executeStatement("ALTER TABLE `" . $sqlTable . "` DROP COLUMN `updated_at`");
        } catch (\Throwable $e) {
        }
        try {
            $this->db->executeStatement("ALTER TABLE `" . $sqlTable . "` DROP COLUMN `updatedon`");
        } catch (\Throwable $e) {
        }
    }

    /**
     * @return Rule[]
     */
    public function findAll(): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_rules')
            ->orderBy('name', 'asc');

        return $this->findEntities($qb);
    }

    /**
     * @return Rule[]
     */
    public function findByUserId(string $userId): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_rules')
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->orWhere($qb->expr()->eq('is_default', $qb->createNamedParameter(true)))
            ->orderBy('name', 'asc');

        return $this->findEntities($qb);
    }

    public function findByUserIdAndScope(string $userId, string $scope): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_rules')
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->andWhere($qb->expr()->eq('scope', $qb->createNamedParameter($scope)))
            ->orderBy('name', 'asc');

        return $this->findEntities($qb);
    }

    public function findDefaultRules(): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_rules')
            ->where($qb->expr()->eq('is_default', $qb->createNamedParameter(true)))
            ->orderBy('name', 'asc');

        return $this->findEntities($qb);
    }

    public function findByName(string $name): ?Rule {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_rules')
            ->where($qb->expr()->eq('name', $qb->createNamedParameter($name)))
            ->setMaxResults(1);

        $result = $this->findEntity($qb);
        return $result ?: null;
    }

    public function insert(Entity $rule): Entity {
        $qb = $this->db->getQueryBuilder();
        $qb->insert($this->tableName)
            ->values([
                'name' => $qb->createNamedParameter($rule->getName()),
                'mode' => $qb->createNamedParameter($rule->getMode()),
                'pattern' => $qb->createNamedParameter($rule->getPattern()),
                'replacement' => $qb->createNamedParameter($rule->getReplacement()),
                'target' => $qb->createNamedParameter($rule->getTarget()),
                'sequence_type' => $qb->createNamedParameter($rule->getSequenceType()),
                'start_value' => $qb->createNamedParameter($rule->getStartValue()),
                'zero_padding' => $qb->createNamedParameter($rule->getZeroPadding()),
                'enabled' => $qb->createNamedParameter($rule->isEnabled(), \OCP\DB\Types::BOOLEAN),
                'filter_mode' => $qb->createNamedParameter($rule->getFilterMode()),
                'extensions' => $qb->createNamedParameter($rule->getExtensions()),
                'scope' => $qb->createNamedParameter($rule->getScope()),
                'metadata_field' => $qb->createNamedParameter($rule->getMetadataField()),
                'is_default' => $qb->createNamedParameter($rule->isDefault(), \OCP\DB\Types::BOOLEAN),
                'user_id' => $qb->createNamedParameter($rule->getUserId()),
                'created_at' => $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME),
            ])
            ->executeStatement();

        $rule->setId($qb->getLastInsertId());
        return $rule;
    }

    public function update(Entity $rule): Entity {
        $qb = $this->db->getQueryBuilder();
        $qb->update($this->tableName)
            ->set('name', $qb->createNamedParameter($rule->getName()))
            ->set('mode', $qb->createNamedParameter($rule->getMode()))
            ->set('pattern', $qb->createNamedParameter($rule->getPattern()))
            ->set('replacement', $qb->createNamedParameter($rule->getReplacement()))
            ->set('target', $qb->createNamedParameter($rule->getTarget()))
            ->set('sequence_type', $qb->createNamedParameter($rule->getSequenceType()))
            ->set('start_value', $qb->createNamedParameter($rule->getStartValue()))
            ->set('zero_padding', $qb->createNamedParameter($rule->getZeroPadding()))
            ->set('enabled', $qb->createNamedParameter($rule->isEnabled(), \OCP\DB\Types::BOOLEAN))
            ->set('filter_mode', $qb->createNamedParameter($rule->getFilterMode()))
            ->set('extensions', $qb->createNamedParameter($rule->getExtensions()))
            ->set('scope', $qb->createNamedParameter($rule->getScope()))
            ->set('metadata_field', $qb->createNamedParameter($rule->getMetadataField()))
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($rule->getId(), \OCP\DB\Types::BIGINT)))
            ->executeStatement();

        return $rule;
    }

    public function delete(Entity $rule): Entity {
        $qb = $this->db->getQueryBuilder();
        $qb->delete($this->tableName)
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($rule->getId(), \OCP\DB\Types::BIGINT)))
            ->executeStatement();

        return $rule;
    }

    public function find(int $id): ?Rule {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from($this->tableName)
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($id, \OCP\DB\Types::BIGINT)))
            ->setMaxResults(1);

        try {
            $result = $this->findEntity($qb);
            return $result instanceof Rule ? $result : null;
        } catch (\OCP\AppFramework\Db\DoesNotExistException $e) {
            return null;
        }
    }
}
