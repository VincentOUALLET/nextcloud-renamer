<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\AppFramework\Db\Entity;
use OCP\IDBConnection;

class ReadingProgressMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'renamer_reading_progress', ReadingProgress::class);
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void {
        $sqlTable = '*PREFIX*renamer_reading_progress';

        $this->db->executeStatement("CREATE TABLE IF NOT EXISTS `" . $sqlTable . "` (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL DEFAULT '',
            file_path VARCHAR(1024) NOT NULL DEFAULT '',
            progress_type VARCHAR(50) NOT NULL DEFAULT 'pdf_page',
            progress_value INTEGER NOT NULL DEFAULT 0,
            progress_total INTEGER NOT NULL DEFAULT 0,
            last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user_file (user_id, file_path)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    public function find(string $userId, string $filePath): ?ReadingProgress {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_reading_progress')
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->andWhere($qb->expr()->eq('file_path', $qb->createNamedParameter($filePath)))
            ->setMaxResults(1);

        try {
            $result = $this->findEntity($qb);
            return $result instanceof ReadingProgress ? $result : null;
        } catch (\OCP\AppFramework\Db\DoesNotExistException $e) {
            return null;
        }
    }

    /**
     * @return ReadingProgress[]
     */
    public function findByUserId(string $userId): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_reading_progress')
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->orderBy('last_accessed', 'desc');

        return $this->findEntities($qb);
    }

    /**
     * @return ReadingProgress[]
     */
    public function findByUserAndPaths(string $userId, array $paths): array {
        if (empty($paths)) return [];
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from('renamer_reading_progress')
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->andWhere($qb->expr()->in('file_path', $qb->createNamedParameterArray($paths)));

        return $this->findEntities($qb);
    }

    public function insert(Entity $entity): Entity {
        /** @var ReadingProgress $progress */
        $progress = $entity;
        $qb = $this->db->getQueryBuilder();
        $qb->insert($this->tableName)
            ->values([
                'user_id' => $qb->createNamedParameter($progress->getUserId()),
                'file_path' => $qb->createNamedParameter($progress->getFilePath()),
                'progress_type' => $qb->createNamedParameter($progress->getProgressType()),
                'progress_value' => $qb->createNamedParameter($progress->getProgressValue(), \OCP\DB\Types::INTEGER),
                'progress_total' => $qb->createNamedParameter($progress->getProgressTotal(), \OCP\DB\Types::INTEGER),
                'last_accessed' => $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME),
            ])
            ->executeStatement();

        return $progress;
    }

    public function update(Entity $entity): Entity {
        /** @var ReadingProgress $progress */
        $progress = $entity;
        $qb = $this->db->getQueryBuilder();
        $qb->update($this->tableName)
            ->set('progress_type', $qb->createNamedParameter($progress->getProgressType()))
            ->set('progress_value', $qb->createNamedParameter($progress->getProgressValue(), \OCP\DB\Types::INTEGER))
            ->set('progress_total', $qb->createNamedParameter($progress->getProgressTotal(), \OCP\DB\Types::INTEGER))
            ->set('last_accessed', $qb->createNamedParameter(new \DateTime(), \OCP\DB\Types::DATETIME))
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($progress->getUserId())))
            ->andWhere($qb->expr()->eq('file_path', $qb->createNamedParameter($progress->getFilePath())))
            ->executeStatement();

        return $progress;
    }

    public function upsert(ReadingProgress $progress): ReadingProgress {
        $existing = $this->find($progress->getUserId(), $progress->getFilePath());
        if ($existing) {
            return $this->update($progress);
        }
        return $this->insert($progress);
    }

    public function deleteByFilePath(string $userId, string $filePath): void {
        $qb = $this->db->getQueryBuilder();
        $qb->delete('renamer_reading_progress')
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->andWhere($qb->expr()->eq('file_path', $qb->createNamedParameter($filePath)))
            ->executeStatement();
    }
}
