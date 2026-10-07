<?php

use App\Http\ProgressLimiters;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Tests\Support\RunWorld;

function limitFor(string $name, ?int $userId): Limit
{
    $request = Request::create('/api/progress/'.$name, 'POST');
    if ($userId !== null) {
        $request->setUserResolver(fn () => RunWorld::user(['id' => $userId]));
    }
    $limit = RateLimiter::limiter($name)($request);
    expect($limit)->toBeInstanceOf(Limit::class);

    return $limit;
}

beforeEach(function () {
    ProgressLimiters::register();
});

it('allows 3 imports per hour for each account', function () {
    $limit = limitFor('import', 41);

    expect($limit->maxAttempts)->toBe(3)
        ->and($limit->decaySeconds)->toBe(3600)
        ->and($limit->key)->toBe('import:41');
});

it('allows 3 resets per day for each account', function () {
    $limit = limitFor('reset', 41);

    expect($limit->maxAttempts)->toBe(3)
        ->and($limit->decaySeconds)->toBe(86400)
        ->and($limit->key)->toBe('reset:41');
});

it('keys the import limit of two accounts apart', function () {
    expect(limitFor('import', 41)->key)->not->toBe(limitFor('import', 42)->key);
});
