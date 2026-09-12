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
            'name' => 'page#getUserPreferences',
            'url' => '/api/user-preferences',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#saveUserPreference',
            'url' => '/api/user-preferences',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#metadataReadFolder',
            'url' => '/api/metadata/read-folder',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#listFiles',
            'url' => '/api/files/list',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#readFile',
            'url' => '/api/files/read',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#fileInfo',
            'url' => '/api/files/info',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#scanFolder',
            'url' => '/api/reader/scan',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#saveProgress',
            'url' => '/api/reader/progress',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#readProgress',
            'url' => '/api/reader/progress',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#listLibraries',
            'url' => '/api/reader/libraries',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#createLibrary',
            'url' => '/api/reader/libraries',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#updateLibrary',
            'url' => '/api/reader/libraries/{id}',
            'verb' => 'PUT'
        ],
        [
            'name' => 'page#deleteLibrary',
            'url' => '/api/reader/libraries/{id}',
            'verb' => 'DELETE'
        ],
        [
            'name' => 'page#listCollections',
            'url' => '/api/reader/collections',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#createCollection',
            'url' => '/api/reader/collections',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#updateCollection',
            'url' => '/api/reader/collections/{id}',
            'verb' => 'PUT'
        ],
        [
            'name' => 'page#deleteCollection',
            'url' => '/api/reader/collections/{id}',
            'verb' => 'DELETE'
        ],
        [
            'name' => 'page#pdfConvertCbz',
            'url' => '/api/pdf/convert-cbz',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#pdfPreview',
            'url' => '/api/pdf/preview',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#pdfPage',
            'url' => '/api/pdf/page',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#playlistExport',
            'url' => '/api/playlist/export',
            'verb' => 'POST'
        ],
        [
            'name' => 'page#convertCbrToCbz',
            'url' => '/api/reader/convert-cbr',
            'verb' => 'POST'
        ],
    ],
];
