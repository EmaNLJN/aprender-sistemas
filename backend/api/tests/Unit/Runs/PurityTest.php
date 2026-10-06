<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;

arch('the program and the evidence touch no database, queue, HTTP client, log or cache (FR-038)')
    ->expect(['App\Runs\Program', 'App\Runs\Evidence'])
    ->not->toUse([DB::class, Queue::class, Http::class, Log::class, Cache::class, 'Illuminate\Database']);
