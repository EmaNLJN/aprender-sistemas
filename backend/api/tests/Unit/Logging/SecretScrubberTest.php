<?php

use App\Logging\SecretScrubber;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;
use Illuminate\Support\Str;
use Monolog\Formatter\JsonFormatter;
use Monolog\Level;
use Monolog\LogRecord;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(fn () => config(['taller.log_hmac_key' => 'secret']));

function scrub(string $message, array $context = []): LogRecord
{
    return (new SecretScrubber)(new LogRecord(new DateTimeImmutable, 'stderr', Level::Error, $message, $context));
}

function withSession(string $id): void
{
    $request = Request::create('/api/session');
    $store = new Store('taller', new ArraySessionHandler(120));
    $store->setId($id);
    $request->setLaravelSession($store);
    app()->instance('request', $request);
}

it('replaces every email by email: and its HMAC', function () {
    expect(scrub('Ingreso de ana@x.com y de Ana@X.com')->message)
        ->toBe('Ingreso de email:8a7122f355ddfdc8 y de email:8a7122f355ddfdc8');
});

it('replaces the emails inside the context, nested too', function () {
    expect(scrub('x', ['user' => ['contact' => 'ana@x.com']])->context)
        ->toBe(['user' => ['contact' => 'email:8a7122f355ddfdc8']]);
});

it('redacts the value of the sensitive keys, nested and whatever the case', function () {
    $context = ['password' => 'hunter2', 'nested' => ['Token' => 'abc', 'Authorization' => 'Bearer z', 'cookie' => 'c=1', 'secret' => 's'], 'kept' => 'visible'];

    expect(scrub('x', $context)->context)->toBe([
        'password' => '[redactado]',
        'nested' => ['Token' => '[redactado]', 'Authorization' => '[redactado]', 'cookie' => '[redactado]', 'secret' => '[redactado]'],
        'kept' => 'visible',
    ]);
});

it('redacts the invitation and reset fragments by name', function () {
    $link = 'http://localhost:8080/#invitacion=Xk3pQ9 y http://localhost:8080/#restablecer=Tt7Lm2&email=ana%40x.com fin';

    expect(scrub($link)->message)
        ->toBe('http://localhost:8080/#invitacion=[redactado] y http://localhost:8080/#restablecer=[redactado] fin');
});

it('replaces the id of the current session', function () {
    $id = Str::random(40);
    withSession($id);

    expect(scrub("SQL: select * from sessions where id = {$id}", ['id' => $id])->message)
        ->not->toContain($id)
        ->and(scrub("id={$id}")->message)->toBe('id=[redactado]');
});

it('leaves everything else untouched', function () {
    withSession(Str::random(40));
    $record = scrub('El pedido tardó 120 ms', ['status' => 200, 'path' => '/api/guide', 'flag' => true]);

    expect($record->message)->toBe('El pedido tardó 120 ms')
        ->and($record->context)->toBe(['status' => 200, 'path' => '/api/guide', 'flag' => true]);
});

it('keeps the email and the session id out of a QueryException, which carries the SQL with its values', function () {
    $id = Str::random(40);
    withSession($id);
    $error = new QueryException('mysql', 'select * from `sessions` join `users` where `sessions`.`id` = ? and `email` = ?', [$id, 'ana@x.com'], new PDOException('boom'));
    $record = scrub('Falló la consulta', ['exception' => $error]);

    $line = (new JsonFormatter)->format($record);

    expect($line)->not->toContain($id)->not->toContain('ana@x.com')->toContain('email:8a7122f355ddfdc8');
});
