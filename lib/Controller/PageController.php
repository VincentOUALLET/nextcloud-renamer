<?php

namespace OCA\Renamer\Controller;

use OCP\AppFramework\Controller;
use OC\AppFramework\Http\Request;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\RedirectResponse; // added
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
	 * @AdminRequired
	 * @NoCSRFRequired
	 */
	public function index(): TemplateResponse {
		try {
			$user = $this->userSession->getUser();
			$files = [];
			$folderExists = true;

			if ($user === null) {
				// no user -> empty list
				$folderExists = false;
				return new TemplateResponse('renamer', 'main', [
					'files' => $files,
					'requesttoken' => \OCP\Util::getRequestToken(),
					'folderExists' => $folderExists
				]);
			}

			$uid = $user->getUID();
			$userFolder = $this->rootFolder->getUserFolder($uid);

			try {
				$testFolder = $userFolder->get('RenamerTest');
			} catch (\Exception $e) {
				// folder not found
				$folderExists = false;
				return new TemplateResponse('renamer', 'main', [
					'files' => $files,
					'requesttoken' => \OCP\Util::getRequestToken(),
					'folderExists' => $folderExists
				]);
			}

			// scan files and filter by regex /^\[TGx\]|\[Torrent911\]/
			try {
				$items = $testFolder->getDirectoryListing();
				foreach ($items as $item) {
					if ($item->getType() === 'file') {
						$name = $item->getName();
						// match filenames that start with either [TGx] or [Torrent911]
						if (preg_match('/^(?:\[TGx\]|\[Torrent911\])/', $name)) {
							$files[] = $name;
						}
					}
				}
			} catch (\Exception $e) {
				// ignore and return empty list
			}

			// compute request token in a Nextcloud-compatible way with fallback
			$requesttoken = '';
			try {
				if (isset(\OC::$server)) {
					$manager = \OC::$server->getCsrfTokenManager();
					if ($manager !== null) {
						$tokenObj = $manager->getToken();
						if (is_object($tokenObj) && method_exists($tokenObj, 'getValue')) {
							$requesttoken = $tokenObj->getValue();
						} else {
							$requesttoken = (string)$tokenObj;
						}
					}
				}
			} catch (\Throwable $e) {
				// fallback to empty token if token manager unavailable
				$requesttoken = '';
			}

			return new TemplateResponse('renamer', 'main', [
				'files' => $files,
				'requesttoken' => $requesttoken,
				'folderExists' => $folderExists
			]);
		} catch (\Throwable $e) {
			// fallback to PHP error_log to ensure the message is recorded
			error_log('renamer index() exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
			// compute fallback token (empty) to avoid calling removed API
			$requesttoken = '';
			return new TemplateResponse('renamer', 'main', [
				'files' => [],
				'requesttoken' => $requesttoken,
				'folderExists' => false,
				'error' => 'Internal error: ' . $e->getMessage()
			]);
		}
	}

	/**
	 * @AdminRequired
	 */
	public function rename() : DataResponse {
		try {
			// detect AJAX/XHR requests
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
				// build short query params for redirect so template can show summary
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

			$params = $this->request->getParams();
			$selected = $params['files'] ?? [];

			// log incoming call for debugging
			try {
				$uidLog = 'n/a';
				$u = $this->userSession->getUser();
				if ($u !== null) {
					$uidLog = $u->getUID();
				}
				$selLog = is_array($selected) ? implode(', ', $selected) : json_encode($selected);
				error_log('renamer rename() called by ' . $uidLog . ' selected=' . $selLog);
			} catch (\Throwable $e) {
				// ignore logging errors
			}

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

			try {
				$testFolder = $userFolder->get('RenamerTest');
			} catch (\Exception $e) {
				$result['success'] = false;
				$result['errors'][] = 'RenamerTest folder not found';
				return $respond($result);
			}

			if (!is_array($selected)) {
				$result['success'] = false;
				$result['errors'][] = 'No files selected';
				return $respond($result);
			}

			foreach ($selected as $oldName) {
				try {
					$node = $testFolder->get($oldName);
				} catch (\Exception $e) {
					$result['skipped'][] = $oldName;
					continue;
				}

				$newName = preg_replace('/^(?:\[TGx\]|\[Torrent911\])/', '', $oldName);
				$newName = trim($newName);

				try {
					$existing = $testFolder->get($newName);
					$result['skipped'][] = $oldName;
					continue;
				} catch (\Exception $e) {
					// not found -> OK
				}

				try {
					$node->move($newName);
					$result['renamed'][] = ['from' => $oldName, 'to' => $newName];
				} catch (\Exception $e) {
					$result['errors'][] = sprintf('Failed to rename %s: %s', $oldName, $e->getMessage());
				}
			}

			// after processing, log summary
			try {
				error_log(sprintf(
					'renamer rename() result for %s: renamed=%d skipped=%d errors=%d',
					isset($uidLog) ? $uidLog : 'n/a',
					count($result['renamed']),
					count($result['skipped']),
					count($result['errors'])
				));
			} catch (\Throwable $e) {
				// ignore logging errors
			}

			return $respond($result);
		} catch (\Throwable $e) {
			// fallback to PHP error_log to ensure the message is recorded
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