<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;

class Collection extends Entity {
    /** @var int */
    protected $libraryId;

    /** @var string */
    protected $userId;

    /** @var string */
    protected $name;

    /** @var string|null */
    protected $description;

    /** @var string|null */
    protected $rules;

    /** @var \DateTime|null */
    protected $createdAt;

    /** @var \DateTime|null */
    protected $updatedAt;

    public function getFieldTypes(): array {
        return [
            'id' => 'integer',
            'libraryId' => 'integer',
            'userId' => 'string',
            'name' => 'string',
            'description' => 'string',
            'rules' => 'string',
            'createdAt' => 'datetime',
            'updatedAt' => 'datetime',
        ];
    }

    public function getLibraryId(): int {
        return $this->libraryId;
    }
    public function setLibraryId(int $libraryId): void {
        $this->libraryId = $libraryId;
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
    public function getRules(): ?string {
        return $this->rules;
    }
    public function setRules(?string $rules): void {
        $this->rules = $rules;
    }
    public function getRulesArray(): array {
        if ($this->rules === null || $this->rules === '') {
            return [];
        }
        $decoded = json_decode($this->rules, true);
        return is_array($decoded) ? $decoded : [];
    }
    public function setRulesArray(array $rules): void {
        $this->rules = json_encode($rules);
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
