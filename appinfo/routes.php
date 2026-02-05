<?php
return [
    'routes' => [
        [
            'name' => 'page#index',
            'url' => '/',
            'verb' => 'GET'
        ],
        [
            'name' => 'page#rename',
            'url' => '/rename',
            'verb' => 'POST'
        ],
    ]
];
