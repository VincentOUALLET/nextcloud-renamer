<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\Renamer\Preview;

use OCP\Files\File;
use OCP\Files\FileInfo;
use OCP\IImage;
use OCP\ITempManager;
use OCP\Preview\IProviderV2;
use OCP\Server;
use Psr\Log\LoggerInterface;

/**
 * Minimal stand-in for the private \OC\Preview\ProviderV2 so the app owns a
 * public, stable base it can extend and unit-test without depending on private
 * core internals (mirrors the approach used by the bundled epubviewer app).
 */
abstract class ProviderV2 implements IProviderV2 {
	protected array $tmpFiles = [];

	public function __construct(
		protected array $options = [],
	) {
	}

	public function isAvailable(FileInfo $file): bool {
		return true;
	}

	/**
	 * Get a path to either the local file or a temporary file copy.
	 *
	 * @param ?int $maxSize maximum size for temporary files
	 */
	protected function getLocalFile(File $file, ?int $maxSize = null): string|false {
		if ($this->useTempFile($file)) {
			$absPath = Server::get(ITempManager::class)->getTemporaryFile();

			if ($absPath === false) {
				Server::get(LoggerInterface::class)->error(
					'Failed to get local file to generate thumbnail for: ' . $file->getPath(),
					['app' => 'renamer']
				);
				return false;
			}

			$content = $file->fopen('r');
			if ($content === false) {
				return false;
			}

			if ($maxSize) {
				$content = stream_get_contents($content, $maxSize);
			}

			file_put_contents($absPath, $content);
			$this->tmpFiles[] = $absPath;
			return $absPath;
		} else {
			$path = $file->getStorage()->getLocalFile($file->getInternalPath());
			if (is_string($path)) {
				return $path;
			} else {
				return false;
			}
		}
	}

	/**
	 * Clean any generated temporary files
	 */
	protected function cleanTmpFiles(): void {
		foreach ($this->tmpFiles as $tmpFile) {
			@unlink($tmpFile);
		}

		$this->tmpFiles = [];
	}

	protected function useTempFile(File $file): bool {
		return $file->isEncrypted() || !$file->getStorage()->isLocal();
	}
}
