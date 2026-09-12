<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;

class ReadingProgress extends Entity {
    /** @var string */
    protected $userId;

    /** @var string */
    protected $filePath;

    /** @var string */
    protected $progressType;

    /** @var int */
    protected $progressValue;

    /** @var int */
    protected $progressTotal;

    /** @var \DateTime|null */
    protected $lastAccessed;

    public function getFieldTypes(): array {
        return [
            'id' => 'integer',
            'userId' => 'string',
            'filePath' => 'string',
            'progressType' => 'string',
            'progressValue' => 'integer',
            'progressTotal' => 'integer',
            'lastAccessed' => 'datetime',
        ];
    }

    public function getUserId(): string {
        return $this->userId;
    }
    public function setUserId(string $userId): void {
        $this->userId = $userId;
    }
    public function getFilePath(): string {
        return $this->filePath;
    }
    public function setFilePath(string $filePath): void {
        $this->filePath = $filePath;
    }
    public function getProgressType(): string {
        return $this->progressType;
    }
    public function setProgressType(string $progressType): void {
        $this->progressType = $progressType;
    }
    public function getProgressValue(): int {
        return $this->progressValue;
    }
    public function setProgressValue(int $progressValue): void {
        $this->progressValue = $progressValue;
    }
    public function getProgressTotal(): int {
        return $this->progressTotal;
    }
    public function setProgressTotal(int $progressTotal): void {
        $this->progressTotal = $progressTotal;
    }
    public function getLastAccessed(): ?\DateTime {
        return $this->lastAccessed;
    }
    public function setLastAccessed(?\DateTime $lastAccessed): void {
        $this->lastAccessed = $lastAccessed;
    }
}
