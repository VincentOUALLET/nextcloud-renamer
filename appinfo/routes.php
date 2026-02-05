<?php
return [
	'routes' => [
		// GET /apps/renamer/ -> admin page
		[
			'name' => 'page#index',
			'url' => '/',
			'verb' => 'GET'
		],
		// accept native POST on the same path so the page won't redirect to /rename
		[
			'name' => 'page#rename',
			'url' => '/',
			'verb' => 'POST'
		],
		// also keep explicit POST /rename
		[
			'name' => 'page#rename',
			'url' => '/rename',
			'verb' => 'POST'
		],
	],
];
