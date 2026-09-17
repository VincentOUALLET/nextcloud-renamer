<?php

declare(strict_types=1);

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;
use OCP\DB\Types;

/**
 * Cache transutilisateur d'une couverture (cover) normalisée.
 *
 * Le cover est adressé par un hash stable du fichier source
 * (sha1(sourcePath . mtime . size)) afin d'être partagé entre tous les
 * utilisateurs (Décision #1 du SPEC-auto-covers) : un utilisateur n'a pas
 * besoin de lire le fichier source s'il est déjà en cache.
 *
 * user_id reste NULL (transutilisateur). L'audit du generateur est porté par
 * source_path + created_at.
 */
class Cover extends Entity {
	public function __construct() {
		$this->addType('sourceMtime', Types::DATETIME);
		$this->addType('sourceSize', Types::INTEGER);
		$this->addType('createdAt', Types::DATETIME);
		$this->addType('updatedAt', Types::DATETIME);
	}

	/** @var string sha1(sourcePath . sourceMtime . sourceSize) */
	protected $hash;

	/** @var string Chemin relatif du tome source (ex: /docs/Akira.pdf) */
	protected $sourcePath;

	/** @var int|null Mtime au moment du cache */
	protected $sourceMtime;

	/** @var int|null Size au moment du cache */
	protected $sourceSize;

	/** @var string Chemin absolu du blob JPEG normalisé (coversDir/<hash>.jpg) */
	protected $coverPath;

	/** @var \DateTime|null */
	protected $createdAt;

	/** @var \DateTime|null */
	protected $updatedAt;

	public function getFieldTypes(): array {
		return [
			'hash' => 'string',
			'source_path' => 'string',
			'source_mtime' => 'integer',
			'source_size' => 'integer',
			'cover_path' => 'string',
			'created_at' => 'datetime',
			'updated_at' => 'datetime',
		];
	}

	public function getHash(): string {
		return (string) $this->hash;
	}

	public function setHash(string $hash): void {
		$this->hash = $hash;
	}

	public function getSourcePath(): string {
		return (string) $this->sourcePath;
	}

	public function setSourcePath(string $sourcePath): void {
		$this->sourcePath = $sourcePath;
	}

	public function getSourceMtime(): ?int {
		$m = $this->sourceMtime;
		return $m === null ? null : (int) $m;
	}

	public function setSourceMtime(?int $sourceMtime): void {
		$this->sourceMtime = $sourceMtime;
	}

	public function getSourceSize(): ?int {
		$s = $this->sourceSize;
		return $s === null ? null : (int) $s;
	}

	public function setSourceSize(?int $sourceSize): void {
		$this->sourceSize = $sourceSize;
	}

	public function getCoverPath(): string {
		return (string) $this->coverPath;
	}

	public function setCoverPath(string $coverPath): void {
		$this->coverPath = $coverPath;
	}

	public function getCreatedAt(): ?\DateTime {
		return $this->createdAt;
	}

	public function setCreatedAt(?\DateTime $createdAt): void {
		$this->createdAt = $createdAt;
	}

	public function getUpdatedAt(): ?\DateTime {
		return $this->updatedAt;
	}

	public function setUpdatedAt(?\DateTime $updatedAt): void {
		$this->updatedAt = $updatedAt;
	}
}
