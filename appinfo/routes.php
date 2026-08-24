<?php
return [
    'routes' => [
        [
            'name' => 'page#index',
            'url' => '/',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#metadataPreview',
            'url' => '/api/metadata/preview',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#doRename',
            'url' => '/rename',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#rules',
            'url' => '/api/rules',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#createRule',
            'url' => '/api/rules',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#updateRule',
            'url' => '/api/rules/{id}',
            'verb' => 'PUT'
        ],
        [
            'name' => 'page#deleteRule',
            'url' => '/api/rules/{id}',
            'verb' => 'DELETE'
        ],
        [
            'name' => 'page#importRules',
            'url' => '/api/rules/import',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#exportRules',
            'url' => '/api/rules/export',
            'verb' => 'GET'
        ],
    ],
];
