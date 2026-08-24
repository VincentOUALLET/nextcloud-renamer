<?php

namespace OCA\Renamer\Service;

use OCP\Files\IRootFolder;
use OCP\Files\Node;
use OCP\IUser;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

class MetadataService {
    private LoggerInterface $logger;
    private IRootFolder $rootFolder;
    private IUserSession $userSession;

    public function __construct(LoggerInterface $logger, IRootFolder $rootFolder, IUserSession $userSession) {
        $this->logger = $logger;
        $this->rootFolder = $rootFolder;
        $this->userSession = $userSession;
        $this->logger->debug('MetadataService constructed', ['app' => 'renamer']);
    }

    /**
     * @param string[] $paths
     * @param string $format Template like "{artist} - {title}" or "{album}/{track} - {title}"
     * @return array{from: string, to: string, error?: string}[]
     */
    public function generate(array $paths, string $format): array {
        $this->logger->debug('MetadataService.generate ENTRY count=' . count($paths) . ' format=' . $format, ['app' => 'renamer']);
        $result = [];

        foreach ($paths as $path) {
            $meta = $this->getMetadata($path);
            if ($meta === null) {
                $this->logger->debug('MetadataService.generate no metadata for ' . $path, ['app' => 'renamer']);
                $result[] = ['from' => $path, 'to' => $path, 'error' => 'No metadata'];
                continue;
            }

            $newName = $format;
            $newName = str_replace('{artist}', $meta['artist'] ?? '', $newName);
            $newName = str_replace('{title}', $meta['title'] ?? '', $newName);
            $newName = str_replace('{album}', $meta['album'] ?? '', $newName);
            $newName = str_replace('{track}', $meta['track'] ?? '', $newName);
            $newName = str_replace('{year}', $meta['year'] ?? '', $newName);
            $newName = str_replace('{genre}', $meta['genre'] ?? '', $newName);

            $newName = preg_replace('/\/+/', '/', $newName);
            $newName = trim($newName, '/');

            $ext = pathinfo($path, PATHINFO_EXTENSION);
            $baseName = pathinfo($path, PATHINFO_FILENAME);

            if ($ext && strpos($newName, $ext) === false) {
                $newName = $newName . '.' . $ext;
            }

            $this->logger->debug('MetadataService.generate result for ' . $path . ' => ' . $newName, ['app' => 'renamer']);
            $result[] = ['from' => $path, 'to' => $newName];
        }

        $this->logger->debug('MetadataService.generate END count=' . count($result), ['app' => 'renamer']);
        return $result;
    }

    private function getMetadata(string $path): ?array {
        $user = $this->userSession->getUser();
        if ($user === null) {
            $this->logger->debug('getMetadata no user', ['app' => 'renamer']);
            return null;
        }

        $uid = $user->getUID();
        try {
            $userFolder = $this->rootFolder->getUserFolder($uid);
            $node = $userFolder->get(ltrim($path, '/'));
        } catch (\Throwable $e) {
            $this->logger->warning('metadata node not found path=' . $path . ' err=' . $e->getMessage(), ['app' => 'renamer']);
            return null;
        }

        $localPath = '';
        try {
            $storage = $node->getStorage();
            if ($storage->isLocal()) {
                $localPath = $storage->getLocalFile($node->getInternalPath());
            }
        } catch (\Throwable $e) {
            $this->logger->debug('metadata local path unavailable', ['app' => 'renamer']);
        }

        if ($localPath && is_file($localPath)) {
            $ffmpegMeta = $this->readFfmpegMetadata($localPath);
            if ($ffmpegMeta !== null) {
                return $ffmpegMeta;
            }
        }

        $this->logger->debug('getMetadata no metadata found for ' . $path, ['app' => 'renamer']);
        return null;
    }

    private function readFfmpegMetadata(string $filePath): ?array {
        $descriptors = [
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $cmd = 'ffmpeg -i ' . escapeshellarg($filePath) . ' 2>&1';
        $process = proc_open($cmd, $descriptors, $pipes);
        if (!is_resource($process)) {
            return null;
        }

        $output = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        if (!$output) {
            return null;
        }

        $meta = [];
        if (preg_match('/artist\s*[:=]\s*(.+)/i', $output, $m)) {
            $meta['artist'] = trim($m[1]);
        }
        if (preg_match('/title\s*[:=]\s*(.+)/i', $output, $m)) {
            $meta['title'] = trim($m[1]);
        }
        if (preg_match('/album\s*[:=]\s*(.+)/i', $output, $m)) {
            $meta['album'] = trim($m[1]);
        }
        if (preg_match('/track\s*[:=]\s*(\d+)/i', $output, $m)) {
            $meta['track'] = trim($m[1]);
        }
        if (preg_match('/date\s*[:=]\s*(\d{4})/i', $output, $m)) {
            $meta['year'] = trim($m[1]);
        }
        if (preg_match('/genre\s*[:=]\s*(.+)/i', $output, $m)) {
            $meta['genre'] = trim($m[1]);
        }

        $this->logger->debug('readFfmpegMetadata for ' . $filePath . ' => ' . json_encode($meta), ['app' => 'renamer']);
        return $meta ?: null;
    }
}
