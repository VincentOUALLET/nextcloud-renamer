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

    public function computeNewName(string $name, string $mode, string $pattern, string $replacement, ?int $index = null, ?string $path = null, bool $increment = false, string $incSep = ' - ', string $incFormat = '{name}{sep}{i}'): ?string {
        try {
            if ($mode === 'metadata' && $path !== null && $pattern !== '') {
                $metaResult = $this->metadataService->generate([$path], $pattern);
                if (!empty($metaResult[0]['to'])) {
                    $name = $metaResult[0]['to'];
                }
            } elseif ($mode === 'regex') {
                if ($pattern === '') {
                    $name = $name;
                } else {
                    $quoted = str_replace('/', '\\/', $pattern);
                    $regex = '/' . $quoted . '/u';
                    if (@preg_match($regex, $name) === false) {
                        $this->logger->warning('Invalid regex pattern: ' . $regex, [
                            'app' => 'renamer',
                            'pattern' => $pattern,
                            'error' => preg_last_error()
                        ]);
                        return null;
                    }
                    $name = preg_replace($regex, $replacement, $name);
                }
            } elseif ($mode === 'replace') {
                $name = str_replace($pattern, $replacement, $name);
            } elseif ($mode === 'cascade') {
                $name = preg_replace('/\[[^\]]*\]/', '', $name);
                $name = preg_replace('/\s+/', ' ', $name);
                $name = trim($name);
            } elseif ($mode === 'camelcase') {
                $name = preg_replace('/[^a-zA-Z0-9]+/u', ' ', $name);
                $name = str_replace(' ', '', ucwords(strtolower($name)));
                if ($name !== '') {
                    $name = mb_strtolower(mb_substr($name, 0, 1)) . mb_substr($name, 1);
                }
            } elseif ($mode === 'snakecase') {
                $name = strtolower($name);
                $name = preg_replace('/[^a-z0-9]+/u', '_', $name);
                $name = trim($name, '_');
            } elseif ($mode === 'removespaces') {
                $name = preg_replace('/\s+/u', '', $name);
            } elseif ($mode === 'capitalizefirst') {
                $name = mb_strtoupper(mb_substr($name, 0, 1)) . mb_substr($name, 1);
            } elseif ($mode === 'capitalizewords') {
                $name = preg_replace_callback('/\b\w/u', function($m) {
                    return mb_strtoupper($m[0]);
                }, $name);
            } elseif ($mode === 'sequence') {
                $name = $this->applySequenceToName($name, $index ?? 1, $pattern, $replacement);
            }

            if ($increment && $index !== null) {
                $name = $this->applyIncrement($name, $index, $incSep, $incFormat);
            }
        } catch (\Throwable $e) {
            $this->logger->error('computeNewName exception: ' . $e->getMessage(), [
                'app' => 'renamer',
                'mode' => $mode,
                'pattern' => $pattern
            ]);
            return null;
        }
        return $name;
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

    public function applySequenceToName(string $name, int $index, string $startValue, string $sequenceType, int $zeroPadding = 0, string $sequencePosition = 'end', ?int $sequenceAt = null): string {
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
            return $seq . ' - ' . $name;
        } elseif ($sequencePosition === 'at' && $sequenceAt !== null && $sequenceAt > 0) {
            $pos = min($sequenceAt, mb_strlen($name));
            return mb_substr($name, 0, $pos) . ' - ' . $seq . mb_substr($name, $pos);
        }

        return $name . ' - ' . $seq;
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
