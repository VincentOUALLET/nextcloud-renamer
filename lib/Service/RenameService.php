<?php

namespace OCA\Renamer\Service;

use OCP\Files\IRootFolder;
use OCP\Files\Node;
use OCP\IUser;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;
use OCA\Renamer\Service\MetadataService;

class RenameService {
    private LoggerInterface $logger;
    private IRootFolder $rootFolder;
    private IUserSession $userSession;
    private MetadataService $metadataService;

    public function __construct(LoggerInterface $logger, IRootFolder $rootFolder, IUserSession $userSession, MetadataService $metadataService) {
        $this->logger = $logger;
        $this->rootFolder = $rootFolder;
        $this->userSession = $userSession;
        $this->metadataService = $metadataService;
        $this->logger->debug('RenameService constructed', ['app' => 'renamer']);
    }

    /**
     * @param string[] $paths
     * @param string $mode
     * @param string $pattern
     * @param string $replacement
     * @param bool $dryRun
     * @param bool $increment
     * @param string $incSep
     * @param string $incFormat
     * @return array{success: bool, renamed: array, skipped: array, errors: array}
     */
    public function execute(array $paths, string $mode, string $pattern, string $replacement, bool $dryRun, bool $increment = false, string $incSep = ' - ', string $incFormat = '{name}{sep}{i}'): array {
        $this->logger->info('RenameService.execute START', ['app' => 'renamer', 'paths' => $paths, 'mode' => $mode, 'dryRun' => $dryRun ? '1' : '0', 'increment' => $increment ? '1' : '0']);
        $result = [
            'success' => true,
            'renamed' => [],
            'skipped' => [],
            'errors' => []
        ];

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

        $applyIncrement = function(string $baseName, int $index) use ($incSep, $incFormat): string {
            if (!$incFormat) return $baseName;
            $ext = '';
            $dotIndex = strrpos($baseName, '.');
            if ($dotIndex > 0) {
                $ext = substr($baseName, $dotIndex);
                $baseName = substr($baseName, 0, $dotIndex);
            }
            $replaced = str_replace(['{name}', '{sep}', '{i}'], [$baseName, $incSep, (string)$index], $incFormat);
            return $replaced . $ext;
        };

        $computeNewName = function(string $name, ?int $index = null, ?string $path = null) use ($mode, $pattern, $replacement, $increment, $applyIncrement): ?string {
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
                }

                if ($increment && $index !== null) {
                    $name = $applyIncrement($name, $index);
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
        };

        $operations = [];
        foreach ($paths as $pathIndex => $path) {
            try {
                $cleanPath = ltrim($path, '/');
                $node = $userFolder->get($cleanPath);
            } catch (\Exception $e) {
                $this->logger->warning('node not found path=' . $path . ' err=' . $e->getMessage(), ['app' => 'renamer']);
                $result['skipped'][] = $path . ' (not found)';
                continue;
            }

            try {
                $name = $node->getName();
                $newName = $computeNewName($name, $pathIndex + 1, $cleanPath);
                if ($newName === null || $newName === $name) {
                    continue;
                }
                $oldRelPath = $cleanPath;
                $newRelPath = dirname($cleanPath) . '/' . $newName;
                $operations[] = ['old' => $oldRelPath, 'new' => $newRelPath];
            } catch (\Throwable $e) {
                $this->logger->warning('collect exception for ' . $path . ': ' . $e->getMessage(), ['app' => 'renamer']);
            }
        }

        $this->logger->info('operations collected count=' . count($operations), ['app' => 'renamer']);

        foreach ($operations as $op) {
            $oldRelPath = $op['old'];
            $newRelPath = $op['new'];

            try {
                $node = $userFolder->get($oldRelPath);
            } catch (\Exception $e) {
                $this->logger->warning('operation node not found old=' . $oldRelPath . ' err=' . $e->getMessage(), ['app' => 'renamer']);
                $result['skipped'][] = $oldRelPath . ' (not found)';
                continue;
            }

            try {
                $userFolder->get($newRelPath);
                $this->logger->info('collision detected new=' . $newRelPath, ['app' => 'renamer']);
                $result['skipped'][] = $oldRelPath . ' (collision)';
                continue;
            } catch (\OCP\Files\NotFoundException $e) {
            } catch (\Throwable $e) {
                $this->logger->warning('collision check exception: ' . $e->getMessage(), ['app' => 'renamer']);
            }

            if ($dryRun) {
                $this->logger->info('dry run old=' . $oldRelPath . ' new=' . $newRelPath, ['app' => 'renamer']);
                $result['renamed'][] = ['from' => $oldRelPath, 'to' => $newRelPath];
                continue;
            }

            try {
                $parentPath = dirname($oldRelPath) ?: '/';
                $newFileName = basename($newRelPath);
                $parent = $userFolder->get(ltrim($parentPath, '/'));
                $parent->move($node, $newFileName);
                $this->logger->info('move success old=' . $oldRelPath . ' new=' . $newRelPath, ['app' => 'renamer']);
                $result['renamed'][] = ['from' => $oldRelPath, 'to' => $newRelPath];
            } catch (\Throwable $e) {
                $this->logger->error('move failed old=' . $oldRelPath . ' new=' . $newRelPath . ' err=' . $e->getMessage(), ['app' => 'renamer']);
                $result['errors'][] = sprintf('Failed to rename %s: %s', $oldRelPath, $e->getMessage());
            }
        }

        $this->logger->info('rename result renamed=' . count($result['renamed']) . ' skipped=' . count($result['skipped']) . ' errors=' . count($result['errors']), ['app' => 'renamer']);
        return $result;
    }
}
