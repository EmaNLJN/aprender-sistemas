<?php

use App\Operations\CheckUnavailable;
use App\Operations\LongTransactionCheck;
use App\Operations\LongTransactionsOpen;
use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\Support\RestrictedMysqlUser;

const MINIMUM_GRANT = 'SELECT ON performance_schema.events_transactions_current';

function openLongTransaction(): Connection
{
    $holder = DB::connectUsing('holder', DB::connection()->getConfig(), true);
    $holder->beginTransaction();
    $holder->select('select * from migrations limit 1');

    return $holder;
}

function withRestrictedUser(array $grants, Closure $body): void
{
    $user = RestrictedMysqlUser::create($grants);
    try {
        $body($user);
    } finally {
        $user->close();
    }
}

it('detects a transaction another connection keeps open past the threshold', function () {
    withRestrictedUser([MINIMUM_GRANT], function (RestrictedMysqlUser $user) {
        $holder = openLongTransaction();
        try {
            sleep(2);
            $thrown = null;
            try {
                (new LongTransactionCheck($user->connection))->run(1);
            } catch (LongTransactionsOpen $error) {
                $thrown = $error;
            }
        } finally {
            $holder->rollBack();
        }

        expect($thrown)->not->toBeNull()
            ->and($thrown->secondsOpen)->toHaveCount(1)
            ->and($thrown->secondsOpen[0])->toBeGreaterThanOrEqual(1);
    });
});

it('does not throw without an open transaction', function () {
    withRestrictedUser([MINIMUM_GRANT], function (RestrictedMysqlUser $user) {
        (new LongTransactionCheck($user->connection))->run(1);

        expect(true)->toBeTrue();
    });
});

it('does not throw for a transaction shorter than the threshold', function () {
    withRestrictedUser([MINIMUM_GRANT], function (RestrictedMysqlUser $user) {
        $holder = openLongTransaction();
        try {
            (new LongTransactionCheck($user->connection))->run(30);
        } finally {
            $holder->rollBack();
        }

        expect(true)->toBeTrue();
    });
});

it('fails closed naming db-grants when the privilege is missing', function () {
    withRestrictedUser([], function (RestrictedMysqlUser $user) {
        expect(fn () => (new LongTransactionCheck($user->connection))->run(1))
            ->toThrow(CheckUnavailable::class, 'db-grants');
    });
});

it('fails closed when the instrumentation is off, because it cannot see itself', function () {
    withRestrictedUser([MINIMUM_GRANT], function (RestrictedMysqlUser $user) {
        DB::statement("UPDATE performance_schema.setup_consumers SET ENABLED = 'NO' WHERE NAME = 'events_transactions_current'");
        try {
            expect(fn () => (new LongTransactionCheck($user->connection))->run(1))
                ->toThrow(CheckUnavailable::class);
        } finally {
            DB::statement("UPDATE performance_schema.setup_consumers SET ENABLED = 'YES' WHERE NAME = 'events_transactions_current'");
        }
    });
});

it('needs the performance_schema privilege because a user without PROCESS does not see the transaction in INNODB_TRX', function () {
    withRestrictedUser([MINIMUM_GRANT], function (RestrictedMysqlUser $user) {
        $holder = openLongTransaction();
        try {
            try {
                $visible = $user->connection->selectOne('select count(*) as total from information_schema.INNODB_TRX')->total;
            } catch (QueryException $error) {
                expect((int) $error->errorInfo[1])->toBe(1227);
                $visible = 0;
            }
        } finally {
            $holder->rollBack();
        }

        expect((int) $visible)->toBe(0);
    });
});

function bindCheckTo(RestrictedMysqlUser $user): void
{
    app()->bind(LongTransactionCheck::class, fn () => new LongTransactionCheck($user->connection));
}

it('exits 0 from the command when no transaction is open', function () {
    withRestrictedUser([MINIMUM_GRANT], function (RestrictedMysqlUser $user) {
        bindCheckTo($user);

        $this->artisan('taller:check-transactions --seconds=1')
            ->expectsOutputToContain('No hay transacciones abiertas hace más de 1 segundos')
            ->assertExitCode(0);
    });
});

it('exits 1 from the command with the count and how long when one is open', function () {
    withRestrictedUser([MINIMUM_GRANT], function (RestrictedMysqlUser $user) {
        bindCheckTo($user);
        $holder = openLongTransaction();
        try {
            sleep(2);
            $this->artisan('taller:check-transactions --seconds=1')
                ->expectsOutputToContain('Hay 1 transacción abierta hace más de 1 segundos')
                ->expectsOutputToContain('cortá la sesión')
                ->assertExitCode(1);
        } finally {
            $holder->rollBack();
        }
    });
});

it('exits 2 from the command with the db-grants command when the privilege is missing', function () {
    withRestrictedUser([], function (RestrictedMysqlUser $user) {
        bindCheckTo($user);

        $this->artisan('taller:check-transactions --seconds=1')
            ->expectsOutputToContain('docker compose --profile ops run --rm db-grants')
            ->assertExitCode(2);
    });
});
