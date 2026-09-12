<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\AppFramework\Db\Entity;
use OCP\IDBConnection;

class LibraryMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'renamer_libraries', Library::class);
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void {
        $sqlTable = '*PREFIX*renamer_libraries';

        $this->db->executeStatement("CREATE TABLE IF NOT EXISTS `" . $sqlTable . "` (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL DEFAULT '',
            name VARCHAR(255) NOT NULL DEFAULT '',
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_name (user_id, name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    /**
     * @return Library[]
     */
    public function findByUserId(string $userId): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_libraries')
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->orderBy('name', 'asc');

        return $this->findEntities($qb);
    }

    public function find(int $id, string $userId): ?Library {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_libraries')
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($id, \OCP\DB\Types::BIGINT)))
            ->andWhere($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->setMaxResults(1);

        try {
            $result = $this->findEntity($qb);
            return $result instanceof Library ? $result : null;
        } catch (\OCP\AppFramework\Db\DoesNotExistException $e) {
            return null;
        }
    }

    public function insert(Entity $entity): Entity {
        /** @var Library $library */
        $library = $entity;
        $qb = $this->db->getQueryBuilder();
        $qb->insert($this->tableName)
            ->values([
                'user_id' => $qb->createNamedParameter($library->getUserId()),
                'name' => $qb->createNamedParameter($library->getName()),
                'description' => $qb->createNamedParameter($library->getDescription() ?? ''),
                'created_at' => $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME),
                'updated_at' => $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME),
            ])
            ->executeStatement();

        $library->setId($qb->getLastInsertId());
        return $library;
    }

    public function update(Entity $entity): Entity {
        /** @var Library $library */
        $library = $entity;
        $qb = $this->db->getQueryBuilder();
        $qb->update($this->tableName)
            ->set('name', $qb->createNamedParameter($library->getName()))
            ->set('description', $qb->createNamedParameter($library->getDescription() ?? ''))
            ->set('updated_at', $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME))
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($library->getId(), \OCP\DB\Types::BIGINT)))
            ->executeStatement();

        return $library;
    }

    public function delete(Entity $entity): Entity {
        $qb = $this->db->getQueryBuilder();
        $qb->delete('renamer_libraries')
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($entity->getId(), \OCP\DB\Types::BIGINT)))
            ->executeStatement();

        return $entity;
    }
}
