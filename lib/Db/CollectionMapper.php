<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;
use OCP\AppFramework\Db\QBMapper;
use OCP\IDBConnection;

class CollectionMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'renamer_collections', Collection::class);
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void {
        $sqlTable = '*PREFIX*renamer_collections';

        $this->db->executeStatement("CREATE TABLE IF NOT EXISTS `" . $sqlTable . "` (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            library_id BIGINT NOT NULL,
            user_id VARCHAR(255) NOT NULL DEFAULT '',
            name VARCHAR(255) NOT NULL DEFAULT '',
            description TEXT,
            rules TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    /**
     * @return Collection[]
     */
    public function findByLibraryId(int $libraryId, string $userId): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_collections')
            ->where($qb->expr()->eq('library_id', $qb->createNamedParameter($libraryId, \OCP\DB\Types::BIGINT)))
            ->andWhere($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->orderBy('name', 'asc');

        return $this->findEntities($qb);
    }

    public function find(int $id, string $userId): ?Collection {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_collections')
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($id, \OCP\DB\Types::BIGINT)))
            ->andWhere($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->setMaxResults(1);

        try {
            $result = $this->findEntity($qb);
            return $result instanceof Collection ? $result : null;
        } catch (\OCP\AppFramework\Db\DoesNotExistException $e) {
            return null;
        }
    }

    public function insert(Entity $collection): Entity {
        /** @var Collection $col */
        $col = $collection;
        $qb = $this->db->getQueryBuilder();
        $qb->insert($this->tableName)
            ->values([
                'library_id' => $qb->createNamedParameter($col->getLibraryId(), \OCP\DB\Types::BIGINT),
                'user_id' => $qb->createNamedParameter($col->getUserId()),
                'name' => $qb->createNamedParameter($col->getName()),
                'description' => $qb->createNamedParameter($col->getDescription() ?? ''),
                'rules' => $qb->createNamedParameter($col->getRules() ?? ''),
                'created_at' => $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME),
                'updated_at' => $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME),
            ])
            ->executeStatement();

        $col->setId($qb->getLastInsertId());
        return $col;
    }

    public function update(Entity $collection): Entity {
        /** @var Collection $col */
        $col = $collection;
        $qb = $this->db->getQueryBuilder();
        $qb->update($this->tableName)
            ->set('name', $qb->createNamedParameter($col->getName()))
            ->set('description', $qb->createNamedParameter($col->getDescription() ?? ''))
            ->set('rules', $qb->createNamedParameter($col->getRules() ?? ''))
            ->set('updated_at', $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME))
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($col->getId(), \OCP\DB\Types::BIGINT)))
            ->executeStatement();

        return $col;
    }

    public function delete(Entity $entity): Entity {
        $qb = $this->db->getQueryBuilder();
        $qb->delete('renamer_collections')
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($entity->getId(), \OCP\DB\Types::BIGINT)))
            ->executeStatement();

        return $entity;
    }
}
