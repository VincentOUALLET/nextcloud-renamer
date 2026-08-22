<?php

namespace OCA\Renamer\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\AppFramework\Http\Response;
use OCP\IRequest;
use OCP\Files\IRootFolder;
use OCP\IUserSession;
use OCP\AppFramework\Annotation\AdminRequired;
use OCP\AppFramework\Annotation\NoCSRFRequired;

class PageController extends Controller {
	/** @var IRootFolder */
	private $rootFolder;
	/** @var IUserSession */
	private $userSession;

	public function __construct(string $appName, IRequest $request, IRootFolder $rootFolder, IUserSession $userSession) {
		parent::__construct($appName, $request);
		$this->rootFolder = $rootFolder;
		$this->userSession = $userSession;
	}

    /**
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        error_log('[Renamer] index() called');
        \OCP\Util::addScript('renamer', 'rename');
        return new TemplateResponse('renamer', 'main', []);
    }

	/**
	 * @AdminRequired
	 */
	public function test(): DataResponse {
		error_log('[Renamer] test() called');
		return new DataResponse(['ok' => true, 'msg' => 'test endpoint reachable']);
	}

    /**
     * @NoCSRFRequired
     */
    public function doRename(): Response {
        error_log('[Renamer] ========== doRenameAction START ==========');
        try {
            $content = file_get_contents('php://input');
            error_log('[Renamer] raw input=' . $content);
            $payload = json_decode($content, true);
            if (!is_array($payload)) {
                $payload = [];
            }
            $paths = isset($payload['paths']) && is_array($payload['paths']) ? $payload['paths'] : [];
            $mode = isset($payload['mode']) ? (string)$payload['mode'] : 'regex';
            $pattern = isset($payload['pattern']) ? (string)$payload['pattern'] : '';
            $replacement = isset($payload['replacement']) ? (string)$payload['replacement'] : '';
            $dryRun = !empty($payload['dryRun']);
            error_log('[Renamer] rename payload paths=' . json_encode($paths) . ' mode=' . $mode . ' dryRun=' . ($dryRun ? '1' : '0'));

            $result = [
                'success' => true,
                'renamed' => [],
                'skipped' => [],
                'errors' => []
            ];

            $user = $this->userSession->getUser();
            if ($user === null) {
                error_log('[Renamer] no user session');
                $result['success'] = false;
                $result['errors'][] = 'No user session';
                return new DataResponse($result);
            }

            $uid = $user->getUID();
            error_log('[Renamer] uid=' . $uid);

            try {
                $userFolder = $this->rootFolder->getUserFolder($uid);
                error_log('[Renamer] userFolder obtained');
            } catch (\Throwable $e) {
                error_log('[Renamer] getUserFolder exception: ' . $e->getMessage());
                $result['success'] = false;
                $result['errors'][] = 'Cannot access user folder: ' . $e->getMessage();
                return new DataResponse($result);
            }

            $computeNewName = function($name) use ($mode, $pattern, $replacement) {
                try {
                    if ($mode === 'regex') {
                        if ($pattern === '') {
                            return $name;
                        }
                        $quoted = str_replace('/', '\\/', $pattern);
                        $regex = '/' . $quoted . '/u';
                        if (@preg_match($regex, $name) === false) {
                            error_log('[Renamer] invalid regex=' . $regex . ' errno=' . preg_last_error());
                            return null;
                        }
                        $res = preg_replace($regex, $replacement, $name);
                        error_log('[Renamer] regex result name=' . $name . ' -> ' . $res);
                        return $res;
                    }
                    if ($mode === 'replace') {
                        return str_replace($pattern, $replacement, $name);
                    }
                    if ($mode === 'cascade') {
                        $name = preg_replace('/\[[^\]]*\]/', '', $name);
                        $name = preg_replace('/\s+/', ' ', $name);
                        return trim($name);
                    }
                } catch (\Throwable $e) {
                    error_log('[Renamer] computeNewName exception: ' . $e->getMessage());
                    return null;
                }
                return $name;
            };

            $getRelativePath = function($node) use ($uid) {
                try {
                    $path = $node->getPath();
                    $prefix = '/files/' . $uid . '/';
                    if (strpos($path . '/', $prefix) === 0) {
                        return substr($path, strlen($prefix) - 1);
                    }
                    return ltrim($path, '/');
                } catch (\Throwable $e) {
                    error_log('[Renamer] getRelativePath exception: ' . $e->getMessage());
                    return '';
                }
            };

            $collect = function($node, $baseRelPath) use ($userFolder, $computeNewName, &$operations, $mode) {
                try {
                    $name = $node->getName();
                    $newName = $computeNewName($name);
                    error_log('[Renamer] collect name=' . $name . ' newName=' . $newName . ' base=' . $baseRelPath);
                    if ($newName === null || $newName === $name) {
                        return;
                    }
                    $oldRelPath = rtrim($baseRelPath, '/') . '/' . $name;
                    $newRelPath = rtrim($baseRelPath, '/') . '/' . $newName;
                    $operations[] = ['old' => $oldRelPath, 'new' => $newRelPath];
                    if ($node->getType() === 'folder' && $mode === 'cascade') {
                        try {
                            foreach ($node->getDirectoryListing() as $child) {
                                $childBase = rtrim($newRelPath, '/');
                                $collect($child, $childBase);
                            }
                        } catch (\Throwable $e) {
                            error_log('[Renamer] collect directory listing exception: ' . $e->getMessage());
                        }
                    }
                } catch (\Throwable $e) {
                    error_log('[Renamer] collect exception: ' . $e->getMessage());
                }
            };

            $operations = [];
            foreach ($paths as $path) {
                error_log('[Renamer] processing path=' . $path);
                try {
                    $node = $userFolder->get(ltrim($path, '/'));
                    error_log('[Renamer] node obtained for path=' . $path . ' type=' . $node->getType());
                } catch (\Exception $e) {
                    error_log('[Renamer] node not found path=' . $path . ' err=' . $e->getMessage());
                    $result['skipped'][] = $path . ' (not found)';
                    continue;
                }
                $baseRelPath = dirname($getRelativePath($node));
                error_log('[Renamer] baseRelPath=' . $baseRelPath);
                $collect($node, $baseRelPath);
            }

            error_log('[Renamer] operations count=' . count($operations));
            usort($operations, function($a, $b) {
                return substr_count($b['old'], '/') - substr_count($a['old'], '/');
            });

            foreach ($operations as $op) {
                $oldRelPath = ltrim($op['old'], '/');
                $newRelPath = ltrim($op['new'], '/');
                error_log('[Renamer] processing operation old=' . $oldRelPath . ' new=' . $newRelPath);
                try {
                    $node = $userFolder->get($oldRelPath);
                } catch (\Exception $e) {
                    error_log('[Renamer] operation node not found old=' . $oldRelPath . ' err=' . $e->getMessage());
                    $result['skipped'][] = $oldRelPath . ' (not found)';
                    continue;
                }
                try {
                    $existing = $userFolder->get($newRelPath);
                    error_log('[Renamer] collision detected new=' . $newRelPath);
                    $result['skipped'][] = $oldRelPath . ' (collision)';
                    continue;
                } catch (\OCP\Files\NotFoundException $e) {
                    error_log('[Renamer] no collision for new=' . $newRelPath);
                } catch (\Throwable $e) {
                    error_log('[Renamer] collision check exception: ' . $e->getMessage());
                }

                if ($dryRun) {
                    error_log('[Renamer] dry run old=' . $oldRelPath . ' new=' . $newRelPath);
                    $result['renamed'][] = ['from' => $oldRelPath, 'to' => $newRelPath];
                    continue;
                }

                try {
                    $parentPath = dirname($oldRelPath) ?: '/';
                    $newFileName = basename($newRelPath);
                    $parent = $userFolder->get(ltrim($parentPath, '/'));
                    $parent->move($node, $newFileName);
                    error_log('[Renamer] move success old=' . $oldRelPath . ' new=' . $newRelPath);
                    $result['renamed'][] = ['from' => $oldRelPath, 'to' => $newRelPath];
                } catch (\Throwable $e) {
                    error_log('[Renamer] move failed old=' . $oldRelPath . ' new=' . $newRelPath . ' err=' . $e->getMessage());
                    $result['errors'][] = sprintf('Failed to rename %s: %s', $oldRelPath, $e->getMessage());
                }
            }

            error_log('[Renamer] rename result renamed=' . count($result['renamed']) . ' skipped=' . count($result['skipped']) . ' errors=' . count($result['errors']));
            error_log('[Renamer] ========== doRenameAction END ==========');
            return new DataResponse($result);
        } catch (\Throwable $e) {
            error_log('[Renamer] ========== doRenameAction EXCEPTION ==========');
            error_log('[Renamer] doRename exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return new DataResponse([
                'success' => false,
                'renamed' => [],
                'skipped' => [],
                'errors' => ['Internal error: ' . $e->getMessage()]
            ]);
        }
    }
}
