<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;
use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

class RuleMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'renamer_rules', Rule::class);
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
                'is_default' => $qb->createNamedParameter($rule->isDefault(), \OCP\DB\Types::BOOLEAN),
                'user_id' => $qb->createNamedParameter($rule->getUserId()),
                'created_at' => $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME),
            ])
            ->executeStatement();

        $rule->setId($qb->getLastInsertId());
        return $rule;
    }

    public function update(Entity $rule, ?array $updatedFields = null): Entity {
        return parent::update($rule, $updatedFields);
    }

    public function delete(Entity $rule): Entity {
        return parent::delete($rule);
    }
}
