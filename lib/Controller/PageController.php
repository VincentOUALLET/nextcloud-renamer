<?php

namespace OCA\Renamer\Controller;

use OCP\AppFramework\Controller;
use OC\AppFramework\Http\Request; // changed from IRequest
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\Files\IRootFolder;
use OCP\IUserSession;
use OCP\AppFramework\Annotation\AdminRequired;

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
						if (preg_match('/^\[TGx\]|\[Torrent911\]/', $name)) {
							$files[] = $name;
						}
					}
				}
			} catch (\Exception $e) {
				// ignore and return empty list
			}

			return new TemplateResponse('renamer', 'main', [
				'files' => $files,
				'requesttoken' => \OCP\Util::getRequestToken(),
				'folderExists' => $folderExists
			]);
		} catch (\Throwable $e) {
			\OCP\Util::writeLog('renamer', 'index() exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString(), \OCP\Util::ERROR);
			// Return a safe template response indicating failure instead of letting the exception bubble
			return new TemplateResponse('renamer', 'main', [
				'files' => [],
				'requesttoken' => \OCP\Util::getRequestToken(),
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
			$params = $this->request->getParams();
			$selected = $params['files'] ?? [];
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
				return new DataResponse($result);
			}

			$uid = $user->getUID();
			$userFolder = $this->rootFolder->getUserFolder($uid);

			try {
				$testFolder = $userFolder->get('RenamerTest');
			} catch (\Exception $e) {
				$result['success'] = false;
				$result['errors'][] = 'RenamerTest folder not found';
				return new DataResponse($result);
			}

			if (!is_array($selected)) {
				$result['success'] = false;
				$result['errors'][] = 'No files selected';
				return new DataResponse($result);
			}

			foreach ($selected as $oldName) {
				try {
					// ensure the original exists
					$node = $testFolder->get($oldName);
				} catch (\Exception $e) {
					$result['skipped'][] = $oldName;
					continue;
				}

				$newName = preg_replace('/^\[TGx\]|\[Torrent911\]/', '', $oldName);
				$newName = trim($newName);

				// ignore collisions
				try {
					$existing = $testFolder->get($newName);
					// if get() didn't throw, file exists -> skip
					$result['skipped'][] = $oldName;
					continue;
				} catch (\Exception $e) {
					// not found -> OK to rename
				}

				try {
					$node->move($newName);
					$result['renamed'][] = ['from' => $oldName, 'to' => $newName];
				} catch (\Exception $e) {
					$result['errors'][] = sprintf('Failed to rename %s: %s', $oldName, $e->getMessage());
				}
			}

			return new DataResponse($result);
		} catch (\Throwable $e) {
			\OCP\Util::writeLog('renamer', 'rename() exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString(), \OCP\Util::ERROR);
			return new DataResponse([
				'success' => false,
				'renamed' => [],
				'skipped' => [],
				'errors' => ['Internal error: ' . $e->getMessage()]
			]);
		}
	}
}
	}
}
