<?php

return [

    'path' => env('CONTENT_PATH', resource_path('content')),

    'cache_store' => env('CONTENT_CACHE_STORE', 'database'),

    'cache_days' => 30,

];
