<?php

namespace OCA\Renamer\Service;

use OCP\Files\Node;
use Psr\Log\LoggerInterface;
use OCA\Renamer\Service\MetadataService;

class PreviewService {
    private LoggerInterface $logger;
    private MetadataService $metadataService;
    private Utils $utils;

    public function __construct(LoggerInterface $logger, MetadataService $metadataService, Utils $utils) {
        $this->logger = $logger;
        $this->metadataService = $metadataService;
        $this->utils = $utils;
        $this->logger->debug('PreviewService constructed', ['app' => 'renamer']);
    }

    /**
     * @param string[] $filePaths
     * @param string $mode
     * @param string $pattern
     * @param string $replacement
     * @param bool $increment
     * @param string $incSep
     * @param string $incFormat
     * @param string|null $target
     * @return array{from: string, to: string}[]
     */
    public function generate(array $filePaths, string $mode, string $pattern, string $replacement, bool $increment = false, string $incSep = ' - ', string $incFormat = '{name}{sep}{i}', ?string $target = 'full'): array {
        $this->logger->debug('PreviewService.generate ENTRY', ['app' => 'renamer', 'count' => count($filePaths), 'mode' => $mode]);
        $previews = [];

        foreach ($filePaths as $index => $path) {
            $baseName = basename($path);
            $parts = $this->utils->splitNameAndExt($baseName);
            $namePart = $parts['name'];
            $extPart = $parts['extension'];
            $target = $target ?? 'full';

            if ($mode === 'metadata' && $path !== '' && $pattern !== '') {
                $metaResult = $this->metadataService->generate([$path], $pattern);
                if (!empty($metaResult[0]['to'])) {
                    $newName = $metaResult[0]['to'];
                } else {
                    $newName = $baseName;
                }
            } elseif ($mode === 'regex' && $pattern !== '') {
                if ($target === 'name') {
                    $newName = preg_replace($pattern, $replacement, $namePart) ?? $namePart;
                    $newName = $newName . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . (preg_replace($pattern, $replacement, $extPart) ?? $extPart);
                    $newName = $newName !== '' ? $namePart . '.' . $newName : $namePart;
                } else {
                    $newName = preg_replace($pattern, $replacement, $baseName) ?? $baseName;
                }
            } elseif ($mode === 'replace' && $pattern !== '') {
                if ($target === 'name') {
                    $newName = str_replace($pattern, $replacement, $namePart) . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . '.' . str_replace($pattern, $replacement, $extPart);
                } else {
                    $newName = str_replace($pattern, $replacement, $baseName);
                }
            } elseif ($mode === 'cascade') {
                if ($target === 'name') {
                    $newName = preg_replace('/\[[^\]]*\]/', '', $namePart);
                    $newName = preg_replace('/\s+/', ' ', $newName);
                    $newName = trim($newName) . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . '.' . trim(preg_replace('/\[[^\]]*\]/', '', $extPart));
                } else {
                    $newName = preg_replace('/\[[^\]]*\]/', '', $baseName);
                    $newName = preg_replace('/\s+/', ' ', $newName);
                    $newName = trim($newName);
                }
            } elseif ($mode === 'camelcase') {
                if ($target === 'name') {
                    $newName = preg_replace('/[^a-zA-Z0-9]+/u', ' ', $namePart);
                    $newName = str_replace(' ', '', ucwords(strtolower($newName)));
                    if ($newName !== '') $newName = mb_strtolower(mb_substr($newName, 0, 1)) . mb_substr($newName, 1);
                    $newName = $newName . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . '.' . ucwords(str_replace(' ', '', preg_replace('/[^a-zA-Z0-9]+/u', ' ', $extPart)));
                } else {
                    $newName = preg_replace('/[^a-zA-Z0-9]+/u', ' ', $baseName);
                    $newName = str_replace(' ', '', ucwords(strtolower($newName)));
                    if ($newName !== '') $newName = mb_strtolower(mb_substr($newName, 0, 1)) . mb_substr($newName, 1);
                }
            } elseif ($mode === 'snakecase') {
                if ($target === 'name') {
                    $newName = strtolower($namePart);
                    $newName = preg_replace('/[^a-z0-9]+/u', '_', $newName);
                    $newName = trim($newName, '_') . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . '.' . trim(strtolower(preg_replace('/[^a-z0-9]+/u', '_', $extPart)), '_');
                } else {
                    $newName = strtolower($baseName);
                    $newName = preg_replace('/[^a-z0-9]+/u', '_', $newName);
                    $newName = trim($newName, '_');
                }
            } elseif ($mode === 'removespaces') {
                if ($target === 'name') {
                    $newName = preg_replace('/\s+/u', '', $namePart) . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . '.' . preg_replace('/\s+/u', '', $extPart);
                } else {
                    $newName = preg_replace('/\s+/u', '', $baseName);
                }
            } elseif ($mode === 'capitalizefirst') {
                if ($target === 'name') {
                    $newName = mb_strtoupper(mb_substr($namePart, 0, 1)) . mb_substr($namePart, 1) . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . '.' . mb_strtoupper(mb_substr($extPart, 0, 1)) . mb_substr($extPart, 1);
                } else {
                    $newName = mb_strtoupper(mb_substr($baseName, 0, 1)) . mb_substr($baseName, 1);
                }
            } elseif ($mode === 'capitalizewords') {
                if ($target === 'name') {
                    $newName = preg_replace_callback('/\b\w/u', function($m) { return mb_strtoupper($m[0]); }, $namePart) . ($extPart !== '' ? '.' . $extPart : '');
                } elseif ($target === 'extension') {
                    $newName = $namePart . '.' . preg_replace_callback('/\b\w/u', function($m) { return mb_strtoupper($m[0]); }, $extPart);
                } else {
                    $newName = preg_replace_callback('/\b\w/u', function($m) { return mb_strtoupper($m[0]); }, $baseName);
                }
            } else {
                $newName = $baseName;
            }

            if ($increment && $incFormat) {
                $ext = '';
                $dotIndex = strrpos($newName, '.');
                if ($dotIndex > 0) {
                    $ext = substr($newName, $dotIndex);
                    $newName = substr($newName, 0, $dotIndex);
                }
                $newName = str_replace(['{name}', '{sep}', '{i}'], [$newName, $incSep, (string)$index], $incFormat) . $ext;
            }

            $previews[] = [
                'from' => $path,
                'to' => $newName,
            ];
        }

        $this->logger->debug('PreviewService.generate END count=' . count($previews), ['app' => 'renamer']);
        return $previews;
    }
}
