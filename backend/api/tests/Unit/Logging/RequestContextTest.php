<?php

use App\Logging\RequestContext;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Monolog\Level;
use Monolog\LogRecord;
use Tests\TestCase;

uses(TestCase::class);

function logRecord(): LogRecord
{
    return new LogRecord(new DateTimeImmutable, 'stderr', Level::Error, 'boom');
}

function requestFrom(string $ip, ?string $requestId): Request
{
    $request = Request::create('/api/session', 'GET', server: ['REMOTE_ADDR' => $ip]);
    if ($requestId !== null) {
        $request->attributes->set('request_id', $requestId);
    }
    app()->instance('request', $request);

    return $request;
}

it('adds the request id, the ip and the user id of the current request to extra', function () {
    requestFrom('203.0.113.9', 'a1b2c3d4e5f60718293a4b5c6d7e8f90');
    Auth::guard('web')->setUser((new User)->forceFill(['id' => 42]));

    $record = (new RequestContext)(logRecord());

    expect($record->extra)->toBe([
        'request_id' => 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        'ip' => '203.0.113.9',
        'user_id' => 42,
    ]);
});

it('reports a null user id for a guest', function () {
    requestFrom('203.0.113.9', 'a1b2c3d4e5f60718293a4b5c6d7e8f90');

    expect((new RequestContext)(logRecord())->extra['user_id'])->toBeNull();
});

it('does not query the database', function () {
    requestFrom('203.0.113.9', 'a1b2c3d4e5f60718293a4b5c6d7e8f90');
    $queries = 0;
    DB::listen(function () use (&$queries) {
        $queries++;
    });

    (new RequestContext)(logRecord());

    expect($queries)->toBe(0);
});

it('adds nothing and does not fail when there is no API request, as in the console', function () {
    requestFrom('127.0.0.1', null);

    expect((new RequestContext)(logRecord())->extra)->toBe([]);
});
