<?php

use App\Http\Middleware\EnsureExpectedAccount;
use App\Http\Middleware\PrivateNoStore;
use App\Http\Middleware\RequirePassword;
use App\Progress\Import\DatabaseLegacyWriter;
use App\Progress\Import\LegacyWriter;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Route;

/**
 * @param  list<string>  $contractOrder
 * @return list<string>
 */
function importResetEffectiveOrder(string $uri, array $contractOrder): array
{
    $route = Route::getRoutes()->match(Request::create($uri, 'POST'));
    app(Kernel::class);
    $effective = array_filter(Route::gatherRouteMiddleware($route), fn ($middleware) => is_string($middleware));

    return array_values(array_intersect($effective, $contractOrder));
}

it('writes the legacy progress through the database writer', function () {
    expect(app(LegacyWriter::class))->toBeInstanceOf(DatabaseLegacyWriter::class);
});

it('runs the middleware of each route in the order of the contract, with the throttle last', function (string $uri, array $contractOrder) {
    expect(importResetEffectiveOrder($uri, $contractOrder))->toBe($contractOrder);
})->with([
    'the import, so its 429 carries the private no-store cache' => ['/api/progress/import', [PrivateNoStore::class, EnsureExpectedAccount::class, ThrottleRequests::class.':import']],
    'the reset, so a request without the confirmed password spends no reset' => ['/api/progress/reset', [PrivateNoStore::class, EnsureExpectedAccount::class, RequirePassword::class, ThrottleRequests::class.':reset']],
]);

it('keeps an import body as it came, while a sibling route trims it and turns an empty string into null', function () {
    Route::post('api/progress/import', fn (Request $request) => response()->json($request->all()));
    Route::post('api/progress/import-sibling', fn (Request $request) => response()->json($request->all()));
    $body = ['text' => "  espacios\n ", 'empty' => ''];

    $this->postJson('/api/progress/import', $body)->assertExactJson($body);
    $this->postJson('/api/progress/import-sibling', $body)->assertExactJson(['text' => 'espacios', 'empty' => null]);
});
