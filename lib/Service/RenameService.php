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
    private Utils $utils;

    public function __construct(LoggerInterface $logger, IRootFolder $rootFolder, IUserSession $userSession, MetadataService $metadataService, Utils $utils) {
        $this->logger = $logger;
        $this->rootFolder = $rootFolder;
        $this->userSession = $userSession;
        $this->metadataService = $metadataService;
        $this->utils = $utils;
    }

    /**
     * @param string[] $paths
     * @param array<int, array{mode: string, pattern: string, replacement: string, target: string, sequenceType: string|null, startValue: int, zeroPadding: int, sequencePosition: string, sequenceAt: int|null, isInc: bool, incSep: string, incFormat: string, enabled: bool}> $rules
     * @return array{success: bool, renamed: array, skipped: array, errors: array}
     */
    public function execute(array $paths, array $rules, array $renames = []): array {
        $this->logger->info('RenameService.execute START', ['app' => 'renamer', 'paths' => $paths, 'rules' => count($rules), 'renames' => count($renames)]);
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

        $operations = [];

        if (!empty($renames)) {
            foreach ($renames as $rename) {
                $from = ltrim($rename['from'] ?? '', '/');
                $to = ltrim($rename['to'] ?? '', '/');
                if (!$from || !$to || $from === $to) {
                    continue;
                }
                $operations[] = ['old' => $from, 'new' => $to, 'name' => basename($to)];
            }
        } else {
            $enabledRules = array_values(array_filter($rules, fn($r) => $r['enabled']));
            if (empty($enabledRules)) {
                $this->logger->info('execute no enabled rules, skipping');
                return $result;
            }

            foreach ($paths as $pathIndex => $path) {
                $cleanPath = ltrim($path, '/');
                $this->logger->debug('execute resolving path=' . $cleanPath, ['app' => 'renamer']);

                try {
                    $node = $userFolder->get($cleanPath);
                } catch (\Exception $e) {
                    $this->logger->warning('node not found path=' . $cleanPath . ' err=' . $e->getMessage(), ['app' => 'renamer']);
                    $result['skipped'][] = $cleanPath . ' (not found)';
                    continue;
                }

                try {
                    $name = $node->getName();
                    $currentName = $name;

                    foreach ($enabledRules as $ruleIndex => $rule) {
                        $newBase = $this->utils->computeNewName(
                            $currentName,
                            $rule['mode'],
                            $rule['pattern'],
                            $rule['replacement'],
                            $pathIndex + 1,
                            $cleanPath,
                            $rule['isInc'] ?? false,
                            $rule['incSep'] ?? ' - ',
                            $rule['incFormat'] ?? '{name}{sep}{i}',
                            $rule
                        );

                        if ($newBase === null) {
                            continue;
                        }

                        $currentName = $newBase;
                    }

                    $parts = $this->utils->splitNameAndExt($currentName);
                    $newRelPath = $currentName;
                    $dir = dirname($cleanPath);
                    $parentPath = ($dir === '.' || $dir === '') ? '' : $dir;
                    $finalPath = $parentPath === '' ? $newRelPath : $parentPath . '/' . $newRelPath;

                    if ($finalPath === $cleanPath) {
                        $this->logger->debug('execute no change for path=' . $cleanPath);
                        continue;
                    }

                    $operations[] = ['old' => $cleanPath, 'new' => $finalPath, 'name' => $newRelPath];
                } catch (\Throwable $e) {
                    $this->logger->warning('collect exception for ' . $cleanPath . ': ' . $e->getMessage(), ['app' => 'renamer']);
                }
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

            try {
                $sourcePath = $node->getPath();
                $targetPath = dirname($sourcePath) . '/' . $op['name'];
                $node->move($targetPath);
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
