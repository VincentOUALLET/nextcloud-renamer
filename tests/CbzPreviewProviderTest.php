<?php

declare(strict_types=1);

namespace OCA\Renamer\Tests\Preview;

use OCA\Renamer\Preview\CbzPreviewProvider;
use PHPUnit\Framework\TestCase;
use ZipArchive;

class CbzPreviewProviderTest extends TestCase {
	private function createZip(array $entries): string {
		$tmp = (string) tempnam(sys_get_temp_dir(), 'cbz_');
		$zip = new ZipArchive();
		self::assertTrue($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true);
		foreach ($entries as $name => $content) {
			if ($content === null) {
				continue;
			}
			$zip->addFromString($name, $content);
		}
		$zip->close();
		return $tmp;
	}

	/**
	 * @dataProvider dataCoverSelection
	 * @param array<string, string|null> $entries
	 */
	public function testSelectCoverEntry(array $entries, ?int $expectedIndex, ?string $expectedName): void {
		$path = $this->createZip($entries);
		$zip = new ZipArchive();
		$opened = $zip->open($path);
		try {
			if ($opened !== true) {
				self::assertNull($expectedIndex);
				return;
			}
			$result = CbzPreviewProvider::selectCoverEntry($zip);
			if ($expectedIndex === null) {
				self::assertNull($result);
			} else {
				self::assertSame($expectedIndex, $result);
				$stat = $zip->statIndex($result);
				self::assertNotFalse($stat);
				self::assertSame($expectedName, $stat['name'] ?? null);
			}
		} finally {
			if ($opened === true) {
				@$zip->close();
			}
			@unlink($path);
		}
	}

	public static function dataCoverSelection(): array {
		// Entry content is irrelevant to selectCoverEntry(), which only scores
		// by name/extension/numbering. Use a non-empty placeholder for images.
		$img = 'image-placeholder';
		$txt = 'hello world';

		return [
			'priority cover.jpg beats numbered and plain text' => [
				['readme.txt' => $txt, 'cover.jpg' => $img, '001.jpg' => $img],
				1,
				'cover.jpg',
			],
			'uppercase Cover.PNG priority match' => [
				['Cover.PNG' => $img, '001.jpg' => $img],
				0,
				'Cover.PNG',
			],
			'numbered picks smallest numeric value at earliest position' => [
				['01.jpg' => $img, '001.jpg' => $img, '1.jpg' => $img],
				0,
				'01.jpg',
			],
			'numbered descending returns smallest numeric value regardless of order' => [
				['005.jpg' => $img, '001.jpg' => $img, '003.jpg' => $img],
				1,
				'001.jpg',
			],
			'no image entry returns null' => [
				['fichier.txt' => $txt, 'notes.md' => $txt],
				null,
				null,
			],
			'path traversal rejected, falls back to valid image' => [
				['../cover.jpg' => $img, '001.jpg' => $img],
				1,
				'001.jpg',
			],
			'first plain image used when no priority/numbered match' => [
				['art.png' => $img, 'photo.jpg' => $img],
				0,
				'art.png',
			],
			'empty archive returns null' => [
				[],
				null,
				null,
			],
		];
	}
}
