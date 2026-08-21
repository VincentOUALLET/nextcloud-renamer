<?php
return [
	'routes' => [
		[
			'name' => 'page#index',
			'url' => '/',
			'verb' => 'GET'
		],
		[
			'name' => 'page#doRename',
			'url' => '/rename',
			'verb' => 'POST'
		],
	],
];
