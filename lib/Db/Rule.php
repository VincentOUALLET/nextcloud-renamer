<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;

class Rule extends Entity {
    /** @var string */
    protected $name;

    /** @var string */
    protected $mode;

    /** @var string */
    protected $pattern;

    /** @var string */
    protected $replacement;

    /** @var string */
    protected $target = 'full';

    /** @var string|null */
    protected $sequenceType;

    /** @var int|null */
    protected $startValue = 1;

    /** @var int */
    protected $zeroPadding = 0;

    /** @var bool */
    protected $enabled = true;

    /** @var string|null */
    protected $filterMode = 'ignored';

    /** @var string|null */
    protected $extensions;

    /** @var bool|null */
    protected $isDefault;

    /** @var string */
    protected $userId = '';

    /** @var \DateTime|null */
    protected $createdAt;

    public function getFieldTypes(): array {
        return [
            'id' => 'integer',
            'name' => 'string',
            'mode' => 'string',
            'pattern' => 'string',
            'replacement' => 'string',
            'target' => 'string',
            'sequenceType' => 'string',
            'startValue' => 'integer',
            'zeroPadding' => 'integer',
            'enabled' => 'bool',
            'filterMode' => 'string',
            'extensions' => 'string',
            'isDefault' => 'bool',
            'userId' => 'string',
            'createdAt' => 'datetime',
        ];
    }

    public function getTarget(): string {
        return $this->target;
    }

    public function setTarget(string $target): void {
        $this->target = $target;
    }

    public function getSequenceType(): ?string {
        return $this->sequenceType;
    }

    public function setSequenceType(?string $sequenceType): void {
        $this->sequenceType = $sequenceType;
    }

    public function getStartValue(): ?int {
        return $this->startValue;
    }

    public function setStartValue(?int $startValue): void {
        $this->startValue = $startValue ?? 1;
    }

    public function getZeroPadding(): int {
        return $this->zeroPadding;
    }

    public function setZeroPadding(int $zeroPadding): void {
        $this->zeroPadding = $zeroPadding;
    }

    public function isEnabled(): bool {
        return (bool)$this->enabled;
    }

    public function setEnabled(bool $enabled): void {
        $this->enabled = $enabled;
    }

    public function getFilterMode(): ?string {
        return $this->filterMode;
    }

    public function setFilterMode(?string $filterMode): void {
        $this->filterMode = $filterMode;
    }

    public function getExtensions(): ?string {
        return $this->extensions;
    }

    public function setExtensions(?string $extensions): void {
        $this->extensions = $extensions;
    }

    public function getExtensionsArray(): array {
        if ($this->extensions === null || $this->extensions === '') {
            return [];
        }
        $decoded = json_decode($this->extensions, true);
        return is_array($decoded) ? $decoded : [];
    }

    public function setExtensionsArray(array $extensions): void {
        $this->extensions = json_encode(array_values(array_unique(array_map('strtolower', $extensions))));
    }

    public function getCreatedAt(): ?\DateTime {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTime $createdAt): void {
        $this->createdAt = $createdAt;
    }

    public function isDefault(): bool {
        return (bool)$this->isDefault;
    }

    public function setIsDefault(bool $isDefault): void {
        $this->isDefault = $isDefault;
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

    public function getMode(): string {
        return $this->mode;
    }

    public function setMode(string $mode): void {
        $this->mode = $mode;
    }

    public function getPattern(): string {
        return $this->pattern;
    }

    public function setPattern(string $pattern): void {
        $this->pattern = $pattern;
    }

    public function getReplacement(): string {
        return $this->replacement;
    }

    public function setReplacement(string $replacement): void {
        $this->replacement = $replacement;
    }
}
