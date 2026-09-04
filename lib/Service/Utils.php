<?php

namespace OCA\Renamer\Service;

use Psr\Log\LoggerInterface;
use OCA\Renamer\Service\MetadataService;

class Utils {
    private LoggerInterface $logger;
    private MetadataService $metadataService;

    public function __construct(LoggerInterface $logger, MetadataService $metadataService) {
        $this->logger = $logger;
        $this->metadataService = $metadataService;
    }

    public function computeNewName(string $name, string $mode, string $pattern, string $replacement, ?int $index = null, ?string $path = null, bool $increment = false, string $incSep = ' - ', string $incFormat = '{name}{sep}{i}', array $options = []): ?string {
        try {
            $target = $options['target'] ?? 'full';
            
            if ($target === 'name') {
                $parts = $this->splitNameAndExt($name);
                $namePart = $parts['name'];
                $extPart = $parts['extension'];
                $newNamePart = $this->applyMode($namePart, $mode, $pattern, $replacement, $index ?? 1, $options);
                if ($newNamePart === null) return null;
                return $newNamePart . ($extPart !== '' ? '.' . $extPart : '');
            } elseif ($target === 'extension') {
                $parts = $this->splitNameAndExt($name);
                $namePart = $parts['name'];
                $extPart = $parts['extension'];
                $newExtPart = $this->applyMode($extPart ?: '', $mode, $pattern, $replacement, $index ?? 1, $options);
                if ($newExtPart === null) return null;
                return $namePart . ($newExtPart !== '' ? '.' . $newExtPart : '');
            } else {
                $newName = $this->applyMode($name, $mode, $pattern, $replacement, $index ?? 1, $options);
                if ($newName === null) return null;
                
                if ($increment && $index !== null) {
                    $newName = $this->applyIncrement($newName, $index, $incSep, $incFormat);
                }
                return $newName;
            }
        } catch (\Throwable $e) {
            $this->logger->error('computeNewName exception: ' . $e->getMessage(), [
                'app' => 'renamer',
                'mode' => $mode,
                'pattern' => $pattern
            ]);
            return null;
        }
    }
    
    private function applyMode(string $part, string $mode, string $pattern, string $replacement, int $index, array $options = []): ?string {
        $sequenceType = $options['sequenceType'] ?? 'numeric';
        $startValue = $options['startValue'] ?? 1;
        $zeroPadding = $options['zeroPadding'] ?? 0;
        $sequencePosition = $options['sequencePosition'] ?? 'end';
        $sequenceAt = $options['sequenceAt'] ?? null;
        $basicSubType = $options['basicSubType'] ?? 'capitalize';
        $insertText = $options['insertText'] ?? '';
        $insertPosition = $options['insertPosition'] ?? 'start';
        $insertAt = $options['insertAt'] ?? 0;
        $truncateLength = $options['truncateLength'] ?? 0;
        $truncateDirection = $options['truncateDirection'] ?? 'end';
        
        try {
            if ($mode === 'metadata') {
                return $part;
            } elseif ($mode === 'regex') {
                if ($pattern === '') return $part;
                $quoted = str_replace('/', '\\/', $pattern);
                $regex = '/' . $quoted . '/u';
                if (@preg_match($regex, $part) === false) {
                    return null;
                }
                return preg_replace($regex, $replacement, $part);
            } elseif ($mode === 'replace' || $mode === 'search_replace') {
                return str_replace($pattern, $replacement, $part);
            } elseif ($mode === 'cascade') {
                return trim(preg_replace('/\[[^\]]*\]/', '', preg_replace('/\s+/', ' ', $part)));
            } elseif ($mode === 'camelcase') {
                $result = str_replace(' ', '', ucwords(strtolower(preg_replace('/[^a-zA-Z0-9]+/u', ' ', $part))));
                if ($result !== '') $result = mb_strtolower(mb_substr($result, 0, 1)) . mb_substr($result, 1);
                return $result;
            } elseif ($mode === 'snakecase') {
                return trim(strtolower(preg_replace('/[^a-z0-9]+/u', '_', $part)), '_');
            } elseif ($mode === 'removespaces') {
                return preg_replace('/\s+/u', '', $part);
            } elseif ($mode === 'capitalizefirst') {
                return mb_strtoupper(mb_substr($part, 0, 1)) . mb_substr($part, 1);
            } elseif ($mode === 'capitalizewords') {
                return preg_replace_callback('/\b\w/u', function($m) { return mb_strtoupper($m[0]); }, $part);
            } elseif ($mode === 'basic') {
                if ($basicSubType === 'lowercase') return strtolower($part);
                elseif ($basicSubType === 'uppercase') return strtoupper($part);
                elseif ($basicSubType === 'capitalize') return mb_strtoupper(mb_substr($part, 0, 1)) . mb_substr($part, 1);
                elseif ($basicSubType === 'capitalize_words') return preg_replace_callback('/\b\w/u', function($m) { return mb_strtoupper($m[0]); }, $part);
            } elseif ($mode === 'sequence') {
                return $this->applySequenceToName($part, $index, $startValue, $sequenceType, $zeroPadding, $sequencePosition, $sequenceAt, $options['incSep'] ?? ' - ');
            } elseif ($mode === 'truncate') {
                $len = (int)($truncateLength ?? 0);
                if ($len <= 0) return '';
                if ($truncateDirection === 'end') return mb_substr($part, 0, mb_strlen($part) - $len);
                return mb_substr($part, $len);
            } elseif ($mode === 'add_text') {
                if ($insertPosition === 'start') return $insertText . $part;
                elseif ($insertPosition === 'end') return $part . $insertText;
                elseif ($insertPosition === 'position' && $insertAt > 0) return mb_substr($part, 0, $insertAt) . $insertText . mb_substr($part, $insertAt);
                return $part . $insertText;
            }
            return $part;
        } catch (\Throwable $e) {
            $this->logger->error('applyMode exception: ' . $e->getMessage(), ['app' => 'renamer', 'mode' => $mode]);
            return null;
        }
    }

    public function applyIncrement(string $baseName, int $index, string $incSep, string $incFormat): string {
        if (!$incFormat) return $baseName;
        $ext = '';
        $dotIndex = strrpos($baseName, '.');
        if ($dotIndex > 0) {
            $ext = substr($baseName, $dotIndex);
            $baseName = substr($baseName, 0, $dotIndex);
        }
        $replaced = str_replace(['{name}', '{sep}', '{i}'], [$baseName, $incSep, (string)$index], $incFormat);
        return $replaced . $ext;
    }

    public function applySequenceToName(string $name, int $index, string $startValue, string $sequenceType, int $zeroPadding = 0, string $sequencePosition = 'end', ?int $sequenceAt = null, string $incSep = ' - '): string {
        $start = (int)($startValue ?: 1);
        $value = $start + $index - 1;

        if ($sequenceType === 'numeric') {
            $seq = $this->sequenceNumeric($value, $zeroPadding);
        } elseif ($sequenceType === 'alphabetic') {
            $seq = $this->sequenceAlphabetic($value);
        } elseif ($sequenceType === 'roman') {
            $seq = $this->sequenceRoman($value);
        } else {
            $seq = (string)$value;
        }

        if ($sequencePosition === 'start') {
            return $seq . $incSep . $name;
        } elseif ($sequencePosition === 'at' && $sequenceAt !== null && $sequenceAt > 0) {
            $pos = min($sequenceAt, mb_strlen($name));
            return mb_substr($name, 0, $pos) . $incSep . $seq . mb_substr($name, $pos);
        }

        return $name . $incSep . $seq;
    }

    private function sequenceNumeric(int $value, int $padding): string {
        if ($padding > 0) {
            return str_pad((string)$value, $padding, '0', STR_PAD_LEFT);
        }
        return (string)$value;
    }

    private function sequenceAlphabetic(int $value): string {
        $result = '';
        $n = $value;
        while ($n > 0) {
            $n--;
            $result = chr(ord('a') + ($n % 26)) . $result;
            $n = (int)($n / 26);
        }
        return $result ?: 'a';
    }

    private function sequenceRoman(int $value): string {
        if ($value < 1 || $value > 3999) {
            return (string)$value;
        }
        $map = [
            'M' => 1000, 'CM' => 900, 'D' => 500, 'CD' => 400,
            'C' => 100, 'XC' => 90, 'L' => 50, 'XL' => 40,
            'X' => 10, 'IX' => 9, 'V' => 5, 'IV' => 4, 'I' => 1
        ];
        $result = '';
        foreach ($map as $roman => $arabic) {
            while ($value >= $arabic) {
                $result .= $roman;
                $value -= $arabic;
            }
        }
        return $result;
    }

    public function splitNameAndExt(string $filename): array {
        $dotIndex = strrpos($filename, '.');
        if ($dotIndex > 0) {
            return [
                'name' => substr($filename, 0, $dotIndex),
                'extension' => substr($filename, $dotIndex + 1),
            ];
        }
        return ['name' => $filename, 'extension' => ''];
    }

    public function applyTargetScope(string $name, string $extension, string $target): string {
        if ($target === 'extension' && $extension !== '') {
            return $extension;
        }
        if ($target === 'name') {
            return $name;
        }
        return $name . ($extension !== '' ? '.' . $extension : '');
    }
}
