<?php

namespace OCA\Renamer\Http;

use OCP\AppFramework\Http\TemplateResponse;

class EpubTemplateResponse extends TemplateResponse {

	public function getHeaders() {
		$headers = parent::getHeaders();
		if (isset($headers['Content-Security-Policy'])) {
			$headers['Content-Security-Policy'] = str_replace(
				"base-uri 'none'",
				"base-uri 'self'",
				$headers['Content-Security-Policy']
			);
		}
		return $headers;
	}
}
