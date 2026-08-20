<?php

namespace OCA\Renamer\Controller;

use OCP\AppFramework\Controller;
use OC\AppFramework\Http\Request;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\Files\IRootFolder;
use OCP\IUserSession;
use OCP\AppFramework\Annotation\AdminRequired;
use OCP\AppFramework\Annotation\NoCSRFRequired;

class PageController extends Controller {
	/** @var IRootFolder */
	private $rootFolder;
	/** @var IUserSession */
	private $userSession;

	// use concrete OC Request class for DI compatibility with Nextcloud 32
	public function __construct(string $appName, Request $request, IRootFolder $rootFolder, IUserSession $userSession) {
		parent::__construct($appName, $request);
		$this->rootFolder = $rootFolder;
		$this->userSession = $userSession;
	}

    /**
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        return new TemplateResponse('renamer', 'main', []);
    }

	/**
	 * Test endpoint to verify JS/fetch/CSP/CSRF basics (returns JSON)
	 *
	 * @AdminRequired
	 */
	public function test(): DataResponse {
		try {
			// simple JSON response for client-side sanity check
			return new DataResponse(['ok' => true, 'msg' => 'test endpoint reachable']);
		} catch (\Throwable $e) {
			error_log('renamer test() exception: ' . $e->getMessage());
			return new DataResponse(['ok' => false, 'error' => $e->getMessage()]);
		}
	}

    /**
     * @NoCSRFRequired
     */
    public function rename() : DataResponse {
        try {
            $isAjax = false;
            try {
                if (method_exists($this->request, 'isAjax')) {
                    $isAjax = $this->request->isAjax();
                } else {
                    $isAjax = ($this->request->getHeader('X-Requested-With') === 'XMLHttpRequest');
                }
            } catch (\Throwable $e) {
                $isAjax = false;
            }

            $respond = function(array $result) use ($isAjax) {
                if ($isAjax) {
                    return new DataResponse($result);
                }
                $params = [];
                if (!empty($result['errors'])) {
                    $params['errors'] = substr(implode(';', $result['errors']), 0, 1000);
                }
                if (!empty($result['renamed'])) {
                    $params['renamed'] = count($result['renamed']);
                }
                if (!empty($result['skipped'])) {
                    $params['skipped'] = count($result['skipped']);
                }
                $qs = http_build_query($params);
                $url = '/apps/renamer/' . ($qs ? ('?'.$qs) : '');
                return new \OCP\AppFramework\Http\RedirectResponse($url);
            };

            $body = $this->request->getParams();
            $content = $this->request->getContent();
            $payload = [];
            if ($content) {
                $decoded = json_decode($content, true);
                if (is_array($decoded)) {
                    $payload = $decoded;
                }
            }
            $paths = isset($payload['paths']) && is_array($payload['paths']) ? $payload['paths'] : [];
            $mode = isset($payload['mode']) ? (string)$payload['mode'] : 'regex';
            $pattern = isset($payload['pattern']) ? (string)$payload['pattern'] : '';
            $replacement = isset($payload['replacement']) ? (string)$payload['replacement'] : '';
            $dryRun = !empty($payload['dryRun']);

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
                return $respond($result);
            }

            $uid = $user->getUID();
            $userFolder = $this->rootFolder->getUserFolder($uid);

            $computeNewName = function($name) use ($mode, $pattern, $replacement) {
                try {
                    if ($mode === 'regex') {
                        return preg_replace($pattern, $replacement, $name);
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
                    return null;
                }
                return $name;
            };

            $getRelativePath = function($node) use ($uid) {
                $path = $node->getPath();
                $prefix = '/files/' . $uid . '/';
                if (strpos($path . '/', $prefix) === 0) {
                    return substr($path, strlen($prefix) - 1);
                }
                return ltrim($path, '/');
            };

            $collect = function($node, $baseRelPath) use ($userFolder, $computeNewName, &$operations, $mode) {
                $name = $node->getName();
                $newName = $computeNewName($name);
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
                        // ignore
                    }
                }
            };

            $operations = [];
            foreach ($paths as $path) {
                try {
                    $node = $userFolder->get(ltrim($path, '/'));
                } catch (\Exception $e) {
                    $result['skipped'][] = $path . ' (not found)';
                    continue;
                }
                $baseRelPath = dirname($getRelativePath($node));
                $collect($node, $baseRelPath);
            }

            usort($operations, function($a, $b) {
                return substr_count($b['old'], '/') - substr_count($a['old'], '/');
            });

            foreach ($operations as $op) {
                $oldRelPath = ltrim($op['old'], '/');
                $newRelPath = ltrim($op['new'], '/');
                try {
                    $node = $userFolder->get($oldRelPath);
                } catch (\Exception $e) {
                    $result['skipped'][] = $oldRelPath . ' (not found)';
                    continue;
                }
                try {
                    $existing = $userFolder->get($newRelPath);
                    $result['skipped'][] = $oldRelPath . ' (collision)';
                    continue;
                } catch (\OCP\Files\NotFoundException $e) {
                } catch (\Throwable $e) {
                }

                if ($dryRun) {
                    $result['renamed'][] = ['from' => $oldRelPath, 'to' => $newRelPath];
                    continue;
                }

                try {
                    $node->move($newRelPath);
                    $result['renamed'][] = ['from' => $oldRelPath, 'to' => $newRelPath];
                } catch (\Throwable $e) {
                    $result['errors'][] = sprintf('Failed to rename %s: %s', $oldRelPath, $e->getMessage());
                }
            }

            return $respond($result);
        } catch (\Throwable $e) {
            error_log('renamer rename() exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return new DataResponse([
                'success' => false,
                'renamed' => [],
                'skipped' => [],
                'errors' => ['Internal error: ' . $e->getMessage()]
            ]);
        }
    }
}