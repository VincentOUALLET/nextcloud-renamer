<?php
return [
	'routes' => [
		// GET /apps/renamer/ -> admin page
		[
			'name' => 'page#index',
			'url' => '/',
			'verb' => 'GET'
		],
		// POST /apps/renamer/rename -> perform renames
		[
			'name' => 'page#rename',
			'url' => '/rename',
			'verb' => 'POST'
		],
	],
];
