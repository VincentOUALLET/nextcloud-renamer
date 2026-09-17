<?php

/**
 * Minimal OCP stubs for unit tests that run outside the Nextcloud runtime.
 * Uses bracketed namespace syntax (PHP disallows `\`-prefixed namespaced
 * declarations in a file otherwise).
 */

namespace OCP\Preview {
	interface IProviderV2 {
		public function getMimeType(): string;
		public function isAvailable(\OCP\Files\FileInfo $file): bool;
		public function getThumbnail(\OCP\Files\File $file, int $maxX, int $maxY): ?\OCP\IImage;
	}
}

namespace OCP {
	interface IImage {}
	interface ITempManager {}
	class Image {}
	class Server {
		public static function get(string $class): object {
			return new \stdClass();
		}
	}
	class Util {
		public static function getLogger(string $app): object {
			return new class {
				public function warning(string $m, array $c = []): void {}
				public function error(string $m, array $c = []): void {}
				public function info(string $m, array $c = []): void {}
				public function debug(string $m, array $c = []): void {}
			};
		}
	}
}

namespace OCP\Files {
	interface FileInfo {}
	interface File {}
}
