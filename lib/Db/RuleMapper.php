<?php

namespace OCA\Renamer\Db;

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

    public function insert(Rule $rule): Rule {
        return parent::insert($rule);
    }

    public function update(Rule $rule, ?array $updatedFields = null): Rule {
        return parent::update($rule, $updatedFields);
    }

    public function delete(Rule $rule): void {
        parent::delete($rule);
    }
}
