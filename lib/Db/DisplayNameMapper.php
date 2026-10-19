<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\AppFramework\Db\Entity;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\IDBConnection;

class DisplayNameMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'renamer_display_names', DisplayName::class);
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void {
        $sqlTable = '*PREFIX*renamer_display_names';

        $this->db->executeStatement("CREATE TABLE IF NOT EXISTS `" . $sqlTable . "` (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            library_id BIGINT NOT NULL DEFAULT 0,
            file_path VARCHAR(1024) NOT NULL DEFAULT '',
            display_name VARCHAR(1024) NOT NULL DEFAULT '',
            UNIQUE KEY uk_library_path (library_id, file_path)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    /**
     * @return DisplayName[]
     */
    public function findByLibraryId(int $libraryId): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from($this->tableName)
            ->where($qb->expr()->eq('library_id', $qb->createNamedParameter($libraryId, \OCP\DB\Types::BIGINT)));

        return $this->findEntities($qb);
    }

    /**
     * Upsert a display-name override for a given library + file path.
     * If $displayName is null or empty, any existing override is deleted.
     */
    public function upsert(int $libraryId, string $filePath, ?string $displayName): void {
        $libraryId = (int) $libraryId;
        $filePath = ltrim((string) $filePath, '/');
        if ($filePath === '') {
            return;
        }

        if ($displayName === null || trim($displayName) === '') {
            $qb = $this->db->getQueryBuilder();
            $qb->delete($this->tableName)
                ->where($qb->expr()->eq('library_id', $qb->createNamedParameter($libraryId, \OCP\DB\Types::BIGINT)))
                ->andWhere($qb->expr()->eq('file_path', $qb->createNamedParameter($filePath)))
                ->executeStatement();
            return;
        }

        $existing = $this->find($libraryId, $filePath);
        if ($existing) {
            $qb = $this->db->getQueryBuilder();
            $qb->update($this->tableName)
                ->set('display_name', $qb->createNamedParameter($displayName))
                ->where($qb->expr()->eq('library_id', $qb->createNamedParameter($libraryId, \OCP\DB\Types::BIGINT)))
                ->andWhere($qb->expr()->eq('file_path', $qb->createNamedParameter($filePath)))
                ->executeStatement();
        } else {
            $qb = $this->db->getQueryBuilder();
            $qb->insert($this->tableName)
                ->values([
                    'library_id' => $qb->createNamedParameter($libraryId, \OCP\DB\Types::BIGINT),
                    'file_path' => $qb->createNamedParameter($filePath),
                    'display_name' => $qb->createNamedParameter($displayName),
                ])
                ->executeStatement();
        }
    }

    private function find(int $libraryId, string $filePath): ?DisplayName {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from($this->tableName)
            ->where($qb->expr()->eq('library_id', $qb->createNamedParameter($libraryId, \OCP\DB\Types::BIGINT)))
            ->andWhere($qb->expr()->eq('file_path', $qb->createNamedParameter($filePath)))
            ->setMaxResults(1);

        try {
            $result = $this->findEntity($qb);
            return $result instanceof DisplayName ? $result : null;
        } catch (\OCP\AppFramework\Db\DoesNotExistException $e) {
            return null;
        }
    }
}
