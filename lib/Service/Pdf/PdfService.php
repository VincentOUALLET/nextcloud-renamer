<?php

namespace OCA\Renamer\Service\Pdf;

use OCP\Files\IRootFolder;
use OCP\Files\File;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;
use OCA\Renamer\Service\Utils;

class PdfService {
    private LoggerInterface $logger;
    private IRootFolder $rootFolder;
    private IUserSession $userSession;
    private Utils $utils;

    public function __construct(LoggerInterface $logger, IRootFolder $rootFolder, IUserSession $userSession, Utils $utils) {
        $this->logger = $logger;
        $this->rootFolder = $rootFolder;
        $this->userSession = $userSession;
        $this->utils = $utils;
    }

    /**
     * Convert each selected PDF to a CBZ (zip of native JPEG images) in the same folder.
     *
     * Uses pdfimages from poppler-utils to extract embedded images without re-encoding,
     * then assembles them in a zip with php-zip.
     *
     * @param string[] $paths
     * @return array{success: bool, converted: array<int,array{from:string,to:string}>, skipped: string[], errors: string[]}
     */
    public function convertToCbz(array $paths): array {
        $result = [
            'success' => true,
            'converted' => [],
            'skipped' => [],
            'errors' => [],
        ];

        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');

        if (!class_exists('\ZipArchive')) {
            $result['success'] = false;
            $result['errors'][] = 'ZipArchive PHP extension is required to build CBZ archives';
            return $result;
        }

        $pdfImagesBin = $this->resolvePdfImages();
        if ($pdfImagesBin === null) {
            $result['success'] = false;
            $result['errors'][] = 'pdfimages (poppler-utils) is required and was not found on the server PATH';
            return $result;
        }

        $user = $this->userSession->getUser();
        if ($user === null) {
            $result['success'] = false;
            $result['errors'][] = 'No user session';
            return $result;
        }
        $uid = $user->getUID();
        try {
            $userFolder = $this->rootFolder->getUserFolder($uid);
        } catch (\Throwable $e) {
            $result['success'] = false;
            $result['errors'][] = 'Cannot access user folder: ' . $e->getMessage();
            return $result;
        }

        foreach ($paths as $path) {
            $cleanPath = ltrim((string)$path, '/');
            if ($cleanPath === '') {
                continue;
            }
            try {
                $node = $userFolder->get($cleanPath);
            } catch (\Throwable $e) {
                $result['errors'][] = $cleanPath . ': ' . $e->getMessage();
                continue;
            }
            if (!$node instanceof File) {
                $result['skipped'][] = $cleanPath;
                continue;
            }

            $baseName = $node->getName();
            if (!preg_match('/\.pdf$/i', $baseName)) {
                $result['skipped'][] = $cleanPath;
                continue;
            }
            $cbzName = preg_replace('/\.pdf$/i', '', $baseName) . '.cbz';

            $tmpRoot = sys_get_temp_dir() . '/renamer-pdf-' . bin2hex(random_bytes(6));
            if (!@mkdir($tmpRoot, 0700, true) && !is_dir($tmpRoot)) {
                $result['errors'][] = $cleanPath . ': cannot create temp dir';
                continue;
            }

            $tmpPdfPath = $tmpRoot . '.pdf';
            try {
                if (!$node->isReadable()) {
                    throw new \RuntimeException('file not readable');
                }
                $stream = $node->fopen('r');
                if ($stream === false) {
                    throw new \RuntimeException('cannot open file handle');
                }
                $outFp = fopen($tmpPdfPath, 'wb');
                if ($outFp === false) {
                    fclose($stream);
                    throw new \RuntimeException('cannot create temp file');
                }
                while (!feof($stream)) {
                    $chunk = fread($stream, 65536);
                    if ($chunk === false) break;
                    fwrite($outFp, $chunk);
                }
                fclose($stream);
                fclose($outFp);
            } catch (\Throwable $e) {
                if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
                $this->rrmdir($tmpRoot);
                $result['errors'][] = $cleanPath . ': cannot read (' . $e->getMessage() . ')';
                continue;
            }

            try {
                $pageCount = $this->getPageCount($pdfImagesBin, $tmpPdfPath);
                if ($pageCount === 0) {
                    $this->rrmdir($tmpRoot);
                    if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
                    $result['errors'][] = $cleanPath . ': PDF corrompu ou illisible (pdfinfo: 0 pages)';
                    continue;
                }
            } catch (\Throwable $e) {
                $this->rrmdir($tmpRoot);
                if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
                $result['errors'][] = $cleanPath . ': PDF corrompu ou illisible (' . $e->getMessage() . ')';
                continue;
            }

            try {
                $images = $this->extractImagesViaPdfImages($pdfImagesBin, $tmpPdfPath, $tmpRoot);
            } catch (\Throwable $e) {
                $this->rrmdir($tmpRoot);
                if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
                $result['errors'][] = $cleanPath . ': ' . $e->getMessage();
                continue;
            }

            if (empty($images)) {
                $this->rrmdir($tmpRoot);
                if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
                $result['errors'][] = $cleanPath . ': no images extracted by pdfimages';
                continue;
            }

            $renamed = $this->renameToSequential($images, $tmpRoot);
            if (empty($renamed)) {
                $this->rrmdir($tmpRoot);
                if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
                $result['errors'][] = $cleanPath . ': cannot sequence images';
                continue;
            }

            $tmpZip = $tmpRoot . '.cbz';
            try {
                $this->buildZip($renamed, $tmpZip);
            } catch (\Throwable $e) {
                $this->rrmdir($tmpRoot);
                if (is_file($tmpZip)) @unlink($tmpZip);
                if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
                $result['errors'][] = $cleanPath . ': cannot build cbz (' . $e->getMessage() . ')';
                continue;
            }

            try {
                $parent = $node->getParent();
                $cbzPath = $this->uniqueSiblingName($parent, $cbzName);
                $cbzFile = $parent->newFile($cbzPath, file_get_contents($tmpZip));
                $result['converted'][] = [
                    'from' => $cleanPath,
                    'to' => ltrim($parent->getInternalPath() . '/' . $cbzFile->getName(), '/'),
                ];
            } catch (\Throwable $e) {
                $result['errors'][] = $cleanPath . ': cannot save cbz (' . $e->getMessage() . ')';
            }

            $this->rrmdir($tmpRoot);
            if (is_file($tmpPdfPath)) @unlink($tmpPdfPath);
            if (is_file($tmpZip)) @unlink($tmpZip);
        }

        return $result;
    }

    /**
     * Locate pdfimages binary on the server. Returns the absolute path or null.
     */
    private function resolvePdfImages(): ?string {
        if (!function_exists('proc_open')) return null;
        $candidates = ['/usr/bin/pdfimages', '/usr/local/bin/pdfimages', '/opt/homebrew/bin/pdfimages'];
        foreach ($candidates as $bin) {
            if (is_executable($bin)) return $bin;
        }
        $which = @shell_exec('command -v pdfimages');
        if (is_string($which) && $which !== '') {
            $path = trim($which);
            if (is_executable($path)) return $path;
        }
        return null;
    }

    /**
     * Run pdfinfo on the temp PDF and return the page count, or 0 on failure.
     */
    private function getPageCount(string $bin, string $pdfPath): int {
        $pdfInfoBin = preg_replace('/pdfimages$/', 'pdfinfo', $bin);
        if (!is_executable($pdfInfoBin)) {
            $found = @shell_exec('command -v pdfinfo');
            if (is_string($found) && $found !== '') $pdfInfoBin = trim($found);
        }
        if (!is_executable($pdfInfoBin)) {
            return -1;
        }
        $cmd = escapeshellcmd($pdfInfoBin) . ' ' . escapeshellarg($pdfPath);
        $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $proc = @proc_open($cmd, $descriptors, $pipes);
        if (!is_resource($proc)) return 0;
        $stdout = stream_get_contents($pipes[1]) ?: '';
        foreach ($pipes as $p) { @fclose($p); }
        $exit = proc_close($proc);
        if ($exit !== 0) return 0;
        if (preg_match('/^Pages:\s+(\d+)/m', $stdout, $m)) return (int)$m[1];
        return 0;
    }

    /**
     * Run pdfimages -j on the temp PDF and return the list of extracted image paths.
     *
     * @return string[]
     */
    private function extractImagesViaPdfImages(string $bin, string $pdfPath, string $outDir): array {
        $prefix = $outDir . DIRECTORY_SEPARATOR . 'page';
        $cmd = escapeshellcmd($bin) . ' -j ' . escapeshellarg($pdfPath) . ' ' . escapeshellarg($prefix);
        $this->logger->debug('PdfService: running pdfimages', ['app' => 'renamer', 'cmd' => $cmd]);

        $descriptors = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $proc = @proc_open($cmd, $descriptors, $pipes);
        if (!is_resource($proc)) {
            throw new \RuntimeException('cannot start pdfimages (proc_open failed)');
        }

        $stdout = stream_get_contents($pipes[1]) ?: '';
        $stderr = stream_get_contents($pipes[2]) ?: '';
        foreach ($pipes as $p) { @fclose($p); }
        $exit = proc_close($proc);

        if ($exit !== 0) {
            throw new \RuntimeException('pdfimages failed (exit ' . $exit . '): ' . trim($stderr . ' ' . $stdout));
        }

        $files = @scandir($outDir) ?: [];
        $images = [];
        foreach ($files as $f) {
            if ($f === '.' || $f === '..') continue;
            if (!preg_match('/^page(-\d+|-000)?\.(jpg|jpeg|ppm|pbm|png)$/i', $f)) continue;
            $full = $outDir . DIRECTORY_SEPARATOR . $f;
            if (is_file($full)) $images[] = $full;
        }
        return $images;
    }

    /**
     * Rename extracted images to a sequential zero-padded naming matching page order.
     *
     * @param string[] $images
     * @return string[] Renamed image files in order
     */
    private function renameToSequential(array $images, string $outDir): array {
        usort($images, function ($a, $b) {
            return strnatcmp(basename($a), basename($b));
        });
        $renamed = [];
        $i = 1;
        foreach ($images as $img) {
            $ext = strtolower(pathinfo($img, PATHINFO_EXTENSION));
            if ($ext === 'jpeg') $ext = 'jpg';
            $newName = $outDir . DIRECTORY_SEPARATOR . sprintf('%04d.%s', $i, $ext);
            if (!@rename($img, $newName)) return [];
            $renamed[] = $newName;
            $i++;
        }
        return $renamed;
    }

    /**
     * Build a CBZ (zip archive) from a list of image files.
     *
     * @param string[] $images Absolute paths in the desired order
     */
    private function buildZip(array $images, string $zipPath): void {
        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Cannot open zip');
        }
        $added = 0;
        foreach ($images as $full) {
            if (!is_file($full)) continue;
            $zip->addFile($full, basename($full));
            $added++;
        }
        $zip->close();
        if ($added === 0) {
            throw new \RuntimeException('No images to add to cbz');
        }
    }

    private function uniqueSiblingName($parent, string $name): string {
        if (!$parent->nodeExists($name)) {
            return $name;
        }
        $pathInfo = pathinfo($name);
        $stem = $pathInfo['filename'];
        $ext = isset($pathInfo['extension']) ? ('.' . $pathInfo['extension']) : '';
        $i = 1;
        while ($i < 1000) {
            $candidate = $stem . ' (' . $i . ')' . $ext;
            if (!$parent->nodeExists($candidate)) {
                return $candidate;
            }
            $i++;
        }
        return $stem . '-' . time() . $ext;
    }

    private function rrmdir(string $dir): void {
        if (!is_dir($dir)) return;
        $items = @scandir($dir);
        if (!$items) return;
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') continue;
            $full = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($full)) {
                $this->rrmdir($full);
            } else {
                @unlink($full);
            }
        }
        @rmdir($dir);
    }
}