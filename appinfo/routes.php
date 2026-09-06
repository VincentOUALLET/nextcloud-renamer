<?php
return [
    'routes' => [
        [
            'name' => 'page#index',
            'url' => '/',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#metadataRead',
            'url' => '/api/metadata/read',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#metadataWrite',
            'url' => '/api/metadata/write',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#metadataDiagnose',
            'url' => '/api/metadata/diagnose',
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
        [
            'name' => 'page#savePlan',
            'url' => '/api/plans/save',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#loadPlan',
            'url' => '/api/plans/load/{name}',
            'verb' => 'GET',
            'defaults' => ['name' => '']
        ],
        [
            'name' => 'page#deletePlan',
            'url' => '/api/plans/delete/{name}',
            'verb' => 'DELETE'
        ],
        [
            'name' => 'page#getTranslations',
            'url' => '/api/translations',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#saveTranslation',
            'url' => '/api/translations',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#pdfConvertCbz',
            'url' => '/api/pdf/convert-cbz',
            'verb' => 'POST'
        ],
    ],
];
