<?php

declare(strict_types=1);

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;
use OCP\AppFramework\Db\QBMapper;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\DB\Types;
use OCP\IDBConnection;

class CoverMapper extends QBMapper {
	public function __construct(IDBConnection $db) {
		parent::__construct($db, 'renamer_covers', Cover::class);
		$this->ensureTableExists();
	}

	private function ensureTableExists(): void {
		$sqlTable = '*PREFIX*renamer_covers';
		$this->db->executeStatement('CREATE TABLE IF NOT EXISTS `' . $sqlTable . '` (
 			hash            VARCHAR(40)  NOT NULL PRIMARY KEY,
 			source_path     VARCHAR(512) NOT NULL,
 			source_mtime    BIGINT       NOT NULL DEFAULT 0,
 			source_size     BIGINT       NOT NULL DEFAULT 0,
 			cover_path      VARCHAR(512) NOT NULL,
 			created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
 			updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP
 		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
 		$this->db->executeStatement('CREATE INDEX IF NOT EXISTS idx_cover_source_path ON `' . $sqlTable . '` (source_path)');
	}

	public function findByHash(string $hash): ?Cover {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->tableName)
			->where($qb->expr()->eq('hash', $qb->createNamedParameter($hash)));
		try {
			$result = $this->findEntity($qb);
			return $result instanceof Cover ? $result : null;
		} catch (\OCP\AppFramework\Db\DoesNotExistException $e) {
			return null;
		}
	}

	public function findBySourcePath(string $sourcePath): ?Cover {
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->tableName)
			->where($qb->expr()->eq('source_path', $qb->createNamedParameter($sourcePath)));
		try {
			$result = $this->findEntity($qb);
			return $result instanceof Cover ? $result : null;
		} catch (\OCP\AppFramework\Db\DoesNotExistException $e) {
			return null;
		}
	}

	/**
	 * Lookup par lot par source_path — élimine le N+1 query dans getCovers().
	 *
	 * @param string[] $paths
	 * @return array<string, Cover> map source_path => Cover
	 */
	public function findBySourcePaths(array $paths): array {
		if (empty($paths)) {
			return [];
		}
		$qb = $this->db->getQueryBuilder();
		$qb->select('*')
			->from($this->tableName)
			->where($qb->expr()->in('source_path', $qb->createNamedParameter(array_values($paths), IQueryBuilder::PARAM_STR_ARRAY)));
		$result = $qb->executeQuery();
		$out = [];
		while ($row = $result->fetch()) {
			$cover = new Cover();
			$cover->setHash((string) $row['hash']);
			$cover->setSourcePath((string) $row['source_path']);
			$cover->setSourceMtime((int) $row['source_mtime']);
			$cover->setSourceSize((int) $row['source_size']);
			$cover->setCoverPath((string) $row['cover_path']);
			$out[(string) $row['source_path']] = $cover;
		}
		return $out;
	}

	public function save(Cover $cover): Cover {
		$exists = $this->findByHash($cover->getHash());
		$now = new \DateTime();
		if ($exists !== null) {
			$qb = $this->db->getQueryBuilder();
			$qb->update($this->tableName)
				->set('source_path', $qb->createNamedParameter($cover->getSourcePath()))
				->set('source_mtime', $qb->createNamedParameter($cover->getSourceMtime(), Types::INTEGER))
				->set('source_size', $qb->createNamedParameter($cover->getSourceSize(), Types::INTEGER))
				->set('cover_path', $qb->createNamedParameter($cover->getCoverPath()))
				->set('updated_at', $qb->createNamedParameter($now, Types::DATETIME))
				->where($qb->expr()->eq('hash', $qb->createNamedParameter($cover->getHash())));
			$qb->executeStatement();
			$cover->setCreatedAt($now);
			$cover->setUpdatedAt($now);
			return $cover;
		}
		$qb = $this->db->getQueryBuilder();
		$qb->insert($this->tableName)
			->values([
				'hash'         => $qb->createNamedParameter($cover->getHash()),
				'source_path'  => $qb->createNamedParameter($cover->getSourcePath()),
				'source_mtime' => $qb->createNamedParameter($cover->getSourceMtime(), Types::INTEGER),
				'source_size'  => $qb->createNamedParameter($cover->getSourceSize(), Types::INTEGER),
				'cover_path'   => $qb->createNamedParameter($cover->getCoverPath()),
				'created_at'   => $qb->createNamedParameter($now, Types::DATETIME),
				'updated_at'   => $qb->createNamedParameter($now, Types::DATETIME),
			])
			->executeStatement();
		$cover->setCreatedAt($now);
		$cover->setUpdatedAt($now);
		return $cover;
	}

	public function deleteByHash(string $hash): int {
		$qb = $this->db->getQueryBuilder();
		return $qb->delete($this->tableName)
			->where($qb->expr()->eq('hash', $qb->createNamedParameter($hash)))
			->executeStatement();
	}
}
