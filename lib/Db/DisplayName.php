<?php

namespace OCA\Renamer\Db;

use OCP\AppFramework\Db\Entity;
use OCP\DB\Types;

class DisplayName extends Entity {
    public function __construct() {
        $this->addType('libraryId', Types::INTEGER);
        $this->addType('filePath', Types::STRING);
        $this->addType('displayName', Types::STRING);
    }

    /** @var int */
    protected $libraryId;

    /** @var string */
    protected $filePath;

    /** @var string */
    protected $displayName;

    public function getLibraryId(): int {
        return (int) $this->libraryId;
    }
    public function setLibraryId(int $libraryId): void {
        $this->libraryId = $libraryId;
    }
    public function getFilePath(): string {
        return (string) $this->filePath;
    }
    public function setFilePath(string $filePath): void {
        $this->filePath = $filePath;
    }
    public function getDisplayName(): string {
        return (string) $this->displayName;
    }
    public function setDisplayName(string $displayName): void {
        $this->displayName = $displayName;
    }
}
