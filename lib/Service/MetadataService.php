<?php

namespace OCA\Renamer\Service;

use OCP\Files\IRootFolder;
use OCP\Files\Node;
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
     * Read metadata from a file using getID3.
     *
     * @return array{artist?: string, title?: string, album?: string, track?: string, year?: string, genre?: string}|null
     */
    public function getMetadata(string $path): ?array {
        $user = $this->userSession->getUser();
        if ($user === null) {
            throw new \RuntimeException('No user session');
        }

        $uid = $user->getUID();
        try {
            $userFolder = $this->rootFolder->getUserFolder($uid);
            $node = $userFolder->get(ltrim($path, '/'));
        } catch (\Throwable $e) {
            throw new \RuntimeException('File not found: ' . $e->getMessage());
        }

        if (!$node->isReadable()) {
            throw new \RuntimeException('File not readable');
        }

        $localPath = '';
        try {
            $storage = $node->getStorage();
            if ($storage->isLocal()) {
                $localPath = $storage->getLocalFile($node->getInternalPath());
            }
        } catch (\Throwable $e) {
            throw new \RuntimeException('Cannot resolve local path: ' . $e->getMessage());
        }

        if (!$localPath || !is_file($localPath)) {
            throw new \RuntimeException('Local file not found: ' . $localPath);
        }

        return $this->readGetId3Metadata($localPath);
    }

    public function getRawTagKeys(string $path): array {
        $user = $this->userSession->getUser();
        if ($user === null) {
            return [];
        }

        $uid = $user->getUID();
        try {
            $userFolder = $this->rootFolder->getUserFolder($uid);
            $node = $userFolder->get(ltrim($path, '/'));
        } catch (\Throwable $e) {
            return ['error' => 'File not found: ' . $e->getMessage()];
        }

        if (!$node->isReadable()) {
            return ['error' => 'File not readable'];
        }

        $localPath = '';
        try {
            $storage = $node->getStorage();
            if ($storage->isLocal()) {
                $localPath = $storage->getLocalFile($node->getInternalPath());
            }
        } catch (\Throwable $e) {
            return ['error' => 'Cannot resolve local path: ' . $e->getMessage()];
        }

        if (!$localPath || !is_file($localPath)) {
            return ['error' => 'Local file not found: ' . $localPath];
        }

        if (!class_exists('\\getID3')) {
            return ['error' => 'getID3 not available'];
        }

        try {
            $getid3 = new \getID3();
            $getid3->setOption(['option_tags' => true, 'option_extra_info' => true]);
            $info = $getid3->analyze($localPath);

            $keys = [];
            if (isset($info['tags']) && is_array($info['tags'])) {
                foreach ($info['tags'] as $tagFormat => $tags) {
                    if (is_array($tags)) {
                        $keys[$tagFormat] = array_keys($tags);
                    }
                }
            }

            return [
                'file' => basename($localPath),
                'localPath' => $localPath,
                'tag_formats' => $keys,
                'fileformat' => $info['fileformat'] ?? null,
                'encoding' => $info['encoding'] ?? null,
            ];
        } catch (\Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Check if a file format supports metadata writing.
     */
    public function isWritableFormat(string $path): bool {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($ext, ['mp3', 'flac', 'ogg', 'opus', 'wav', 'm4a'], true);
    }

    /**
     * Apply metadata transformation rules to metadata values.
     *
     * @param array{artist?: string, title?: string, album?: string, track?: string, year?: string, genre?: string} $metadata
     * @param array<int, array{mode: string, pattern: string, replacement: string, target: string, metadataField: string, enabled: bool}> $rules
     * @return array{artist?: string, title?: string, album?: string, track?: string, year?: string, genre?: string}
     */
    public function applyRules(array $metadata, array $rules): array {
        $result = $metadata;

        foreach ($rules as $rule) {
            if (!$rule['enabled'] || empty($rule['metadataField'])) {
                continue;
            }

            $field = $rule['metadataField'];
            if (!isset($result[$field])) {
                continue;
            }

            $currentValue = (string)($result[$field] ?? '');
            $newValue = $this->applyRuleToValue($currentValue, $rule);
            $result[$field] = $newValue;
        }

        return $result;
    }

    /**
     * Write metadata to a file using getID3 WriteTags().
     *
     * @param string $path File path
     * @param array{artist?: string, title?: string, album?: string, track?: string, year?: string, genre?: string} $newMetadata
     * @param array{artist?: string, title?: string, album?: string, track?: string, year?: string, genre?: string}|null $originalMetadata Original metadata for merging
     * @return array{success: bool, error?: string}
     */
    public function writeMetadata(string $path, array $newMetadata, ?array $originalMetadata = null): array {
        $user = $this->userSession->getUser();
        if ($user === null) {
            return ['success' => false, 'error' => 'No user session'];
        }

        $uid = $user->getUID();
        try {
            $userFolder = $this->rootFolder->getUserFolder($uid);
            $node = $userFolder->get(ltrim($path, '/'));
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'File not found: ' . $e->getMessage()];
        }

        if (!$node->isReadable() || !$node->isUpdateable()) {
            return ['success' => false, 'error' => 'File not writable'];
        }

        $localPath = '';
        try {
            $storage = $node->getStorage();
            if ($storage->isLocal()) {
                $localPath = $storage->getLocalFile($node->getInternalPath());
            }
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Cannot access local file'];
        }

        if (!$localPath || !is_file($localPath)) {
            return ['success' => false, 'error' => 'Local file not found'];
        }

        $ext = strtolower(pathinfo($localPath, PATHINFO_EXTENSION));
        if ($ext === 'm4a') {
            return $this->writeFfmpegTags($localPath, $newMetadata, $originalMetadata);
        }

        if (!in_array($ext, ['mp3', 'flac', 'ogg', 'opus', 'wav'], true)) {
            return ['success' => false, 'error' => 'Unsupported format for metadata writing'];
        }

        return $this->writeGetId3Tags($localPath, $newMetadata, $originalMetadata);
    }

    /**
     * Write metadata to M4A/MP4 files using ffmpeg.
     *
     * Requires /usr/bin/ffmpeg to be installed on the server.
     */
    private function writeFfmpegTags(string $filePath, array $newMetadata, ?array $originalMetadata = null): array {
        if (!is_executable('/usr/bin/ffmpeg')) {
            return ['success' => false, 'error' => 'ffmpeg not available for M4A metadata writing'];
        }

        $fieldMap = [
            'artist' => 'artist',
            'title' => 'title',
            'album' => 'album',
            'track' => 'track',
            'year' => 'date',
            'genre' => 'genre',
        ];

        $metadataArgs = '';
        foreach ($newMetadata as $field => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            $key = $fieldMap[$field] ?? $field;
            $metadataArgs .= ' -metadata ' . escapeshellarg($key . '=' . $value);
        }

        $tempPath = $filePath . '.tmp.' . uniqid('ffmpeg_', true) . '.m4a';

        $cmd = 'cd ' . escapeshellarg(dirname($filePath)) . ' && '
            . escapeshellcmd('/usr/bin/ffmpeg')
            . ' -i ' . escapeshellarg(basename($filePath))
            . ' -c copy'
            . $metadataArgs
            . ' -y ' . escapeshellarg(basename($tempPath))
            . ' 2>&1';

        $this->logger->debug('writeFfmpegTags cmd=' . $cmd, ['app' => 'renamer']);

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = null;
        $output = '';
        try {
            $process = proc_open($cmd, $descriptors, $pipes, dirname($filePath));
            if (!is_resource($process)) {
                @unlink($tempPath);
                return ['success' => false, 'error' => 'Failed to start ffmpeg process'];
            }

            fclose($pipes[0]);

            $stdout = stream_get_contents($pipes[1]);
            fclose($pipes[1]);

            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[2]);

            $returnCode = proc_close($process);

            $output = trim($stdout . "\n" . $stderr);

            if ($returnCode !== 0 || !file_exists($tempPath)) {
                @unlink($tempPath);
                $this->logger->error('writeFfmpegTags failed for ' . $filePath . ' rc=' . $returnCode . ' output=' . $output, ['app' => 'renamer']);
                return ['success' => false, 'error' => 'ffmpeg failed: ' . $output];
            }

            if (!rename($tempPath, $filePath)) {
                @unlink($tempPath);
                return ['success' => false, 'error' => 'Failed to replace original file with updated metadata'];
            }

            $this->logger->info('writeFfmpegTags success for ' . basename($filePath), ['app' => 'renamer']);
            return ['success' => true];
        } catch (\Throwable $e) {
            if ($process && is_resource($process)) {
                proc_close($process);
            }
            @unlink($tempPath);
            $this->logger->error('writeFfmpegTags exception for ' . $filePath . ': ' . $e->getMessage(), ['app' => 'renamer']);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Read metadata using getID3.
     */
    private function readGetId3Metadata(string $filePath): ?array {
        if (!class_exists('\\getID3')) {
            $this->logger->warning('getID3 class not available for ' . $filePath, ['app' => 'renamer']);
            return null;
        }

        try {
            $getid3 = new \getID3();
            $getid3->setOption(['option_tags' => true, 'option_extra_info' => true]);
            $info = $getid3->analyze($filePath);

            $this->logger->debug('readGetId3Metadata raw tags for ' . basename($filePath) . ' tag_keys=' . implode(',', array_keys($info['tags'] ?? [])), ['app' => 'renamer']);

            $meta = [];

            if (isset($info['tags']['id3v2']) && is_array($info['tags']['id3v2'])) {
                $tags = $info['tags']['id3v2'];
                $meta['artist'] = $this->firstValue($tags, 'artist');
                $meta['title'] = $this->firstValue($tags, 'title');
                $meta['album'] = $this->firstValue($tags, 'album');
                $meta['track'] = $this->firstValue($tags, 'track_number') ?: $this->firstValue($tags, 'track');
                $meta['year'] = $this->firstValue($tags, 'year') ?: $this->firstValue($tags, 'date');
                $meta['genre'] = $this->firstValue($tags, 'genre');
            } elseif (isset($info['tags']['vorbiscomment']) && is_array($info['tags']['vorbiscomment'])) {
                $tags = $info['tags']['vorbiscomment'];
                $meta['artist'] = $this->firstValue($tags, 'artist');
                $meta['title'] = $this->firstValue($tags, 'title');
                $meta['album'] = $this->firstValue($tags, 'album');
                $meta['track'] = $this->firstValue($tags, 'tracknumber') ?: $this->firstValue($tags, 'track');
                $meta['year'] = $this->firstValue($tags, 'date') ?: $this->firstValue($tags, 'year');
                $meta['genre'] = $this->firstValue($tags, 'genre');
            } elseif (isset($info['tags']['quicktime']) && is_array($info['tags']['quicktime'])) {
                $tags = $info['tags']['quicktime'];
                $this->logger->debug('readGetId3Metadata quicktime keys=' . implode(',', array_keys($tags)), ['app' => 'renamer']);
                $meta['artist'] = $this->firstValue($tags, 'artist') ?: $this->firstValue($tags, '\xa9ART');
                $meta['title'] = $this->firstValue($tags, 'title') ?: $this->firstValue($tags, '\xa9nam');
                $meta['album'] = $this->firstValue($tags, 'album') ?: $this->firstValue($tags, '\xa9alb');
                $meta['track'] = $this->firstValue($tags, 'track') ?: $this->firstValue($tags, 'trkn');
                $meta['year'] = $this->firstValue($tags, 'year') ?: $this->firstValue($tags, '\xa9day');
                $meta['genre'] = $this->firstValue($tags, 'genre') ?: $this->firstValue($tags, '\xa9gen');
            } elseif (isset($info['tags']['mp4']) && is_array($info['tags']['mp4'])) {
                $tags = $info['tags']['mp4'];
                $this->logger->debug('readGetId3Metadata mp4 keys=' . implode(',', array_keys($tags)), ['app' => 'renamer']);
                $meta['artist'] = $this->firstValue($tags, 'artist');
                $meta['title'] = $this->firstValue($tags, 'title');
                $meta['album'] = $this->firstValue($tags, 'album');
                $meta['track'] = $this->firstValue($tags, 'track') ?: $this->firstValue($tags, 'tracknumber');
                $meta['year'] = $this->firstValue($tags, 'year') ?: $this->firstValue($tags, 'date');
                $meta['genre'] = $this->firstValue($tags, 'genre');
            }

            $this->logger->debug('readGetId3Metadata for ' . basename($filePath) . ' => ' . json_encode($meta), ['app' => 'renamer']);
            return $meta ?: null;
        } catch (\Throwable $e) {
            $this->logger->warning('readGetId3Metadata error for ' . $filePath . ': ' . $e->getMessage(), ['app' => 'renamer']);
            return null;
        }
    }

    /**
     * Write metadata using getID3 WriteTags().
     */
    private function writeGetId3Tags(string $filePath, array $newMetadata, ?array $originalMetadata = null): array {
        if (!class_exists('\\getID3')) {
            return ['success' => false, 'error' => 'getID3 not available'];
        }

        try {
            $getid3 = new \getID3();
            $getid3->setOption(['option_tags' => true, 'option_extra_info' => true]);
            $info = $getid3->analyze($filePath);

            $tagData = $info['tags'] ?? [];

            $existing = [];
            if (isset($tagData['id3v2']) && is_array($tagData['id3v2'])) {
                $existing = $tagData['id3v2'];
            } elseif (isset($tagData['vorbiscomment']) && is_array($tagData['vorbiscomment'])) {
                $existing = $tagData['vorbiscomment'];
            }

            $merged = $this->mergeMetadata($existing, $newMetadata, $originalMetadata);

            $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
            if ($ext === 'mp3') {
                $tagFormat = 'id3v2.4';
            } elseif (in_array($ext, ['flac', 'ogg', 'opus'], true)) {
                $tagFormat = 'vorbiscomment';
            } else {
                $tagFormat = 'id3v2.4';
            }

            $writer = new \getid3_writetags();
            $writer->filename = $filePath;
            $writer->tagformats = [$tagFormat];
            $writer->tag_data = $merged;
            $result = $writer->WriteTags();

            if ($result !== true) {
                $errors = $writer->warnings ?? $writer->errors ?? [];
                $errorMsg = isset($errors) && !empty($errors) ? implode(', ', $errors) : 'Unknown error writing tags';
                $this->logger->error('writeGetId3Tags failed for ' . $filePath . ': ' . $errorMsg, ['app' => 'renamer']);
                return ['success' => false, 'error' => $errorMsg];
            }

            $this->logger->info('writeGetId3Tags success for ' . basename($filePath), ['app' => 'renamer']);
            return ['success' => true];
        } catch (\Throwable $e) {
            $this->logger->error('writeGetId3Tags exception for ' . $filePath . ': ' . $e->getMessage(), ['app' => 'renamer', 'trace' => $e->getTraceAsString()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Merge new metadata with existing metadata.
     * If a field is empty in newMetadata, keep the original value.
     */
    private function mergeMetadata(array $existing, array $newMetadata, ?array $originalMetadata = null): array {
        $result = $existing;

        $fieldMap = [
            'artist' => 'artist',
            'title' => 'title',
            'album' => 'album',
            'track' => ['track_number', 'track'],
            'year' => ['year', 'date'],
            'genre' => 'genre',
        ];

        foreach ($newMetadata as $field => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            $keys = $fieldMap[$field] ?? $field;
            if (!is_array($keys)) {
                $keys = [$keys];
            }

            foreach ($keys as $key) {
                $result[$key] = [$value];
            }
        }

        return $result;
    }

    /**
     * Apply a single transformation rule to a value.
     */
    private function applyRuleToValue(string $value, array $rule): string {
        $mode = $rule['mode'];
        $pattern = $rule['pattern'] ?? '';
        $replacement = $rule['replacement'] ?? '';

        switch ($mode) {
            case 'search_replace':
                return str_replace($pattern, $replacement, $value);

            case 'regex':
                return preg_replace($pattern, $replacement, $value) ?? $value;

            case 'replace':
                return str_replace($pattern, $replacement, $value);

            case 'truncate':
                $len = (int)($rule['truncateLength'] ?? 0);
                if ($len <= 0) return '';
                $direction = $rule['truncateDirection'] ?? 'end';
                if ($direction === 'start') {
                    return substr($value, $len);
                }
                return substr($value, 0, max(0, strlen($value) - $len));

            case 'add_text':
                $text = $rule['insertText'] ?? '';
                $position = $rule['insertPosition'] ?? 'end';
                if ($position === 'start') {
                    return $text . $value;
                }
                return $value . $text;

            case 'basic':
                $subType = $rule['basicSubType'] ?? '';
                if ($subType === 'lowercase') return strtolower($value);
                if ($subType === 'uppercase') return strtoupper($value);
                if ($subType === 'capitalize') return ucfirst(strtolower($value));
                if ($subType === 'capitalize_words') return ucwords(strtolower($value));
                return $value;

            case 'camelcase':
                $tmp = preg_replace('/[^a-zA-Z0-9]+/u', ' ', $value);
                $tmp = str_replace(' ', '', ucwords(strtolower($tmp)));
                if ($tmp !== '') $tmp = strtolower($tmp[0]) . substr($tmp, 1);
                return $tmp;

            case 'snakecase':
                return strtolower(preg_replace('/[^a-z0-9]+/u', '_', $value));

            case 'removespaces':
                return preg_replace('/\s+/u', '', $value);

            case 'capitalizefirst':
                if ($value === '') return $value;
                return strtoupper($value[0]) . substr($value, 1);

            case 'capitalizewords':
                return preg_replace_callback('/\b\w/u', function ($m) { return strtoupper($m[0]); }, $value);

            case 'cascade':
                return preg_replace('/\[[^\]]*\]/', '', $value);

            case 'sequence':
                $index = (int)($rule['startValue'] ?? 1);
                $type = $rule['sequenceType'] ?? 'numeric';
                $padding = (int)($rule['zeroPadding'] ?? 0);
                $sep = $rule['incSep'] ?? ' - ';
                $seq = $this->sequenceValue($index, $type, $padding);
                $position = $rule['sequencePosition'] ?? 'end';
                if ($position === 'start') {
                    return $seq . $sep . $value;
                }
                return $value . $sep . $seq;

            default:
                return $value;
        }
    }

    private function sequenceValue(int $index, string $type, int $padding): string {
        $i = $index;
        if ($type === 'alphabetic') {
            $value = '';
            $n = $i;
            while ($n > 0) {
                $n--;
                $value = chr(97 + ($n % 26)) . $value;
                $n = (int)($n / 26);
            }
            return $value;
        }
        if ($type === 'roman') {
            $romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
            return $romans[min($i - 1, count($romans) - 1)] ?? (string)$i;
        }
        $value = (string)$i;
        if ($padding > 0) {
            $value = str_pad($value, $padding, '0', STR_PAD_LEFT);
        }
        return $value;
    }

    private function firstValue(array $tags, string $key): ?string {
        if (isset($tags[$key]) && is_array($tags[$key]) && !empty($tags[$key])) {
            return trim((string)$tags[$key][0]);
        }
        return null;
    }
}
