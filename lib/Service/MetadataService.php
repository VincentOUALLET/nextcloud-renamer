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

        if (!$node->isReadable()) {
            $this->logger->debug('getMetadata file not readable path=' . $path, ['app' => 'renamer']);
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

        if (!$localPath || !is_file($localPath)) {
            $this->logger->debug('getMetadata no local path for ' . $path, ['app' => 'renamer']);
            return null;
        }

        $ext = strtolower(pathinfo($localPath, PATHINFO_EXTENSION));
        $writableFormats = ['mp3', 'flac', 'ogg', 'opus', 'wav'];
        if (!in_array($ext, $writableFormats, true)) {
            $this->logger->debug('getMetadata unsupported format for ' . $path . ' ext=' . $ext, ['app' => 'renamer']);
            return null;
        }

        return $this->readGetId3Metadata($localPath);
    }

    /**
     * Check if a file format supports metadata writing.
     */
    public function isWritableFormat(string $path): bool {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($ext, ['mp3', 'flac', 'ogg', 'opus', 'wav'], true);
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
        if (!in_array($ext, ['mp3', 'flac', 'ogg', 'opus', 'wav'], true)) {
            return ['success' => false, 'error' => 'Unsupported format for metadata writing'];
        }

        return $this->writeGetId3Tags($localPath, $newMetadata, $originalMetadata);
    }

    /**
     * Read metadata using getID3.
     */
    private function readGetId3Metadata(string $filePath): ?array {
        if (!class_exists('\\getID3')) {
            $this->logger->warning('getID3 class not available', ['app' => 'renamer']);
            return null;
        }

        try {
            $getid3 = new \getID3();
            $getid3->setOption(['option_tags' => true, 'option_extra_info' => true]);
            $info = $getid3->analyze($filePath);

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

            $getid3->tag_data = $merged;
            $result = $getid3->WriteTags($filePath, $getid3->tag_data, $tagFormat);

            if ($result !== true && is_array($result) && isset($result['error'])) {
                $this->logger->error('writeGetId3Tags failed for ' . $filePath . ': ' . $result['error'], ['app' => 'renamer']);
                return ['success' => false, 'error' => $result['error']];
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
