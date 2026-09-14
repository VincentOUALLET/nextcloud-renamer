<?php

namespace OCA\Renamer\Security;

use OCP\AppFramework\Http\ContentSecurityPolicy;

class ReaderContentSecurityPolicy extends ContentSecurityPolicy {

	public function buildPolicy() {
		$policy = parent::buildPolicy();
		$policy = str_replace("base-uri 'none'", "base-uri 'self' 'data:'", $policy);
		return $policy;
	}
}
