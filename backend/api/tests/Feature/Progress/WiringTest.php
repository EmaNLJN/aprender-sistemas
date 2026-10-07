<?php

use App\Progress\ChangesReader;
use App\Progress\Operations\DatabaseOperationProcessor;
use App\Progress\Operations\OperationProcessor;
use App\Progress\Snapshot\ProgressSnapshotReader;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

it('writes the operations through the database processor', function () {
    expect(app(OperationProcessor::class))->toBeInstanceOf(DatabaseOperationProcessor::class);
});

it('answers the changes with the snapshot reader', function () {
    expect(app(ChangesReader::class))->toBeInstanceOf(ProgressSnapshotReader::class);
});

it('registers the sync limiter', function () {
    expect(RateLimiter::limiter('sync'))->not->toBeNull();
});

it('registers the progress routes behind an account with a verified email', function (string $method, string $uri, array $middleware) {
    $route = Route::getRoutes()->match(Request::create($uri, $method));

    expect($route->gatherMiddleware())->toContain(...$middleware);
})->with([
    'the sync, with its limiter' => ['POST', '/api/sync', ['account', 'verified', 'throttle:sync']],
    'the snapshot' => ['GET', '/api/progress', ['account', 'verified']],
]);

it('keeps a sync body as it came, while a sibling route trims it and turns an empty string into null', function () {
    Route::post('api/sync', fn (Request $request) => response()->json($request->all()));
    Route::post('api/sync-sibling', fn (Request $request) => response()->json($request->all()));
    $body = ['text' => "  espacios\n ", 'empty' => ''];

    $this->postJson('/api/sync', $body)->assertExactJson($body);
    $this->postJson('/api/sync-sibling', $body)->assertExactJson(['text' => 'espacios', 'empty' => null]);
});
