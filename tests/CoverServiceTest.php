<?php

declare(strict_types=1);

namespace OCA\Renamer\Tests\Service;

use OCA\Renamer\Service\CoverService;
use PHPUnit\Framework\TestCase;

class CoverServiceTest extends TestCase {
	private static function png2x2(): string {
		if (!function_exists('imagecreatefromstring') || !function_exists('imagecreatetruecolor')) {
			self::markTestSkipped('GD not available');
		}
		$im = imagecreatetruecolor(2, 2);
		$red = imagecolorallocate($im, 255, 0, 0);
		imagefill($im, 0, 0, $red);
		ob_start();
		imagepng($im);
		$bytes = ob_get_clean();
		imagedestroy($im);
		return $bytes !== false ? $bytes : '';
	}

	public function testComputeHashIsStable(): void {
		$h1 = CoverService::computeHash('/docs/Akira v01.pdf', 1700000000, 123456);
		$h2 = CoverService::computeHash('docs/Akira v01.pdf', 1700000000, 123456);
		self::assertSame($h1, $h2);
		self::assertSame(40, strlen($h1));
		// Mtime/size différents → hash différent.
		self::assertNotSame($h1, CoverService::computeHash('/docs/Akira v01.pdf', 1700000001, 123456));
		self::assertNotSame($h1, CoverService::computeHash('/docs/Akira v01.pdf', 1700000000, 123457));
	}

	public function testSelectSiblingCoverPriority(): void {
		self::assertSame('cover.jpg', CoverService::selectSiblingCover(['001.jpg', 'cover.jpg', 'folder.png']));
		self::assertSame('folder.png', CoverService::selectSiblingCover(['folder.png', '01.jpg']));
		self::assertSame('cover.jpeg', CoverService::selectSiblingCover(['cover.jpeg', 'note.txt']));
		// Pas de nom prioritaire → première image.
		self::assertSame('art.png', CoverService::selectSiblingCover(['art.png', 'photo.jpg']));
		self::assertSame('photo.jpg', CoverService::selectSiblingCover(['photo.jpg']));
		// Aucune image → null.
		self::assertNull(CoverService::selectSiblingCover(['readme.txt', 'notes.md']));
		self::assertNull(CoverService::selectSiblingCover([]));
	}

	public function testNormalizeToJpegProducesValidJpeg(): void {
		$jpeg = CoverService::normalizeToJpeg(self::png2x2(), 300);
		self::assertNotNull($jpeg, 'normalizeToJpeg should return JPEG bytes');
		// Magic JPEG.
		self::assertSame("\xFF\xD8", substr($jpeg, 0, 2));
		// Re-décodable par GD avec la largeur cible.
		if (function_exists('imagecreatefromstring')) {
			$img = @imagecreatefromstring($jpeg);
			if ($img !== false) {
				self::assertSame(300, imagesx($img));
				imagedestroy($img);
			}
		}
	}

	public function testNormalizeToJpegRejectsInvalidBytes(): void {
		self::assertNull(CoverService::normalizeToJpeg('not-an-image-bytes', 300));
		self::assertNull(CoverService::normalizeToJpeg('', 300));
	}

	public function testImageExtensionsConstant(): void {
		self::assertContains('jpg', CoverService::IMAGE_EXTENSIONS);
		self::assertContains('png', CoverService::IMAGE_EXTENSIONS);
		self::assertNotContains('pdf', CoverService::IMAGE_EXTENSIONS);
	}
}
