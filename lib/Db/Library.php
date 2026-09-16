<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;

class Library extends Entity {
    public function __construct() {
        $this->addType('createdAt', \OCP\DB\Types::DATETIME);
        $this->addType('updatedAt', \OCP\DB\Types::DATETIME);
    }

    /**
     * Identifiant de l'administrateur propriétaire de la bibliothèque.
     * Dans le modèle partagé (SPEC-reader-shared), user_id n'est plus un
     * filtre de lecture : toutes les libraries sont visibles de tous les users.
     * La colonne user_id sert désormais de "owner" (audit/responsable).
     *
     * @var string
     */
    protected $userId;

    /** @var string */
    protected $name;

    /** @var string|null */
    protected $description;

    /** @var \DateTime|null */
    protected $createdAt;

    /** @var \DateTime|null */
    protected $updatedAt;

    public function getFieldTypes(): array {
        return [
            'id' => 'integer',
            'userId' => 'string',
            'name' => 'string',
            'description' => 'string',
            'createdAt' => 'datetime',
            'updatedAt' => 'datetime',
        ];
    }

    public function getUserId(): string {
        return $this->userId;
    }
    public function setUserId(string $userId): void {
        $this->userId = $userId;
    }
    public function getName(): string {
        return $this->name;
    }
    public function setName(string $name): void {
        $this->name = $name;
    }
    public function getDescription(): ?string {
        return $this->description;
    }
    public function setDescription(?string $description): void {
        $this->description = $description;
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
