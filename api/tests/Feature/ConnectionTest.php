<?php

use Illuminate\Support\Facades\DB;

it('uses UTC', function () {
    expect(DB::scalar('select @@session.time_zone'))->toBe('+00:00');
});

it('compiles upserts with a row alias instead of VALUES()', function () {
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        $statements[] = $query->sql;
    });

    DB::table('cache')->upsert([['key' => 'probe', 'value' => 'x', 'expiration' => 1]], ['key'], ['value', 'expiration']);

    expect(implode("\n", $statements))->toContain('as laravel_upsert_alias')->not->toContain('values(`');
});

// Only the migrate service bounds lock waits (ADR 0006 D35).
it('keeps the default lock wait timeouts on the php connection', function () {
    expect((int) DB::scalar('select @@session.lock_wait_timeout'))->toBeGreaterThan(5)
        ->and((int) DB::scalar('select @@session.innodb_lock_wait_timeout'))->toBe(50);
});
