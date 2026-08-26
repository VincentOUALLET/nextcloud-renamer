<?php

namespace OCA\Renamer\Service;

use OCP\Files\Node;
use Psr\Log\LoggerInterface;
use OCA\Renamer\Service\MetadataService;

class PreviewService {
    private LoggerInterface $logger;
    private MetadataService $metadataService;

    public function __construct(LoggerInterface $logger, MetadataService $metadataService) {
        $this->logger = $logger;
        $this->metadataService = $metadataService;
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
     * @return array{from: string, to: string}[]
     */
    public function generate(array $filePaths, string $mode, string $pattern, string $replacement, bool $increment = false, string $incSep = ' - ', string $incFormat = '{name}{sep}{i}'): array {
        $this->logger->debug('PreviewService.generate ENTRY', ['app' => 'renamer', 'count' => count($filePaths), 'mode' => $mode]);
        $previews = [];

        foreach ($filePaths as $index => $path) {
            $newName = $this->computeNewName(basename($path), $mode, $pattern, $replacement, $increment, $incSep, $incFormat, $index + 1, $path);
            $previews[] = [
                'from' => $path,
                'to' => $newName,
            ];
        }

        $this->logger->debug('PreviewService.generate END count=' . count($previews), ['app' => 'renamer']);
        return $previews;
    }

    private function computeNewName(string $name, string $mode, string $pattern, string $replacement, bool $increment = false, string $incSep = ' - ', string $incFormat = '{name}{sep}{i}', int $index = 1, ?string $fullPath = null): string {
        if ($mode === 'metadata' && $fullPath !== null && $pattern !== '') {
            $metaResult = $this->metadataService->generate([$fullPath], $pattern);
            if (!empty($metaResult[0]['to'])) {
                $name = $metaResult[0]['to'];
            }
        } elseif ($mode === 'regex' && $pattern !== '') {
            try {
                $name = preg_replace($pattern, $replacement, $name) ?? $name;
            } catch (\Throwable $e) {
                $this->logger->warning('Preview regex error: ' . $e->getMessage(), ['app' => 'renamer']);
                return $name;
            }
        } elseif ($mode === 'replace' && $pattern !== '') {
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
        }

        if ($increment && $incFormat) {
            $ext = '';
            $dotIndex = strrpos($name, '.');
            if ($dotIndex > 0) {
                $ext = substr($name, $dotIndex);
                $name = substr($name, 0, $dotIndex);
            }
            $name = str_replace(['{name}', '{sep}', '{i}'], [$name, $incSep, (string)$index], $incFormat) . $ext;
        }

        return $name;
    }
}
