<?php

use App\Database\WriteTransaction;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function isolationLevel(): string
{
    return DB::selectOne('select @@transaction_isolation as level')->level;
}

// RefreshDatabase wraps each test in a transaction, and MySQL refuses to change the isolation level inside one.
beforeEach(fn () => DB::rollBack());

function runningTransactionLevel(): string
{
    DB::table('cache')->count();

    // information_schema.innodb_trx is a cache that MySQL refreshes at most every 100 ms.
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $row = DB::selectOne('select trx_isolation_level as level from information_schema.innodb_trx where trx_mysql_thread_id = connection_id()');
        if ($row !== null) {
            return $row->level;
        }
        usleep(120000);
    }

    throw new RuntimeException('The transaction does not appear in innodb_trx.');
}

function deadlock(): QueryException
{
    return new QueryException('mysql', 'select 1', [], new PDOException('Deadlock found when trying to get lock; try restarting transaction'));
}

it('runs the callback in READ COMMITTED and leaves the session in REPEATABLE READ', function () {
    $inside = WriteTransaction::run(fn () => isolationLevel());

    expect($inside)->toBe('READ-COMMITTED')
        ->and(isolationLevel())->toBe('REPEATABLE-READ');
});

it('every attempt of a retried deadlock runs in READ COMMITTED', function () {
    $levels = [];

    WriteTransaction::run(function () use (&$levels) {
        $levels[] = runningTransactionLevel();
        if (count($levels) < 3) {
            throw deadlock();
        }
    });

    expect($levels)->toBe(['READ COMMITTED', 'READ COMMITTED', 'READ COMMITTED']);
});

it('returns what the callback returns and commits its writes', function () {
    $result = WriteTransaction::run(function () {
        DB::table('cache')->insert(['key' => 'k', 'value' => 'v', 'expiration' => 1]);

        return 'done';
    });

    expect($result)->toBe('done')
        ->and(DB::table('cache')->where('key', 'k')->exists())->toBeTrue();
    DB::table('cache')->where('key', 'k')->delete();
});

it('rolls back the writes when the callback throws', function () {
    try {
        WriteTransaction::run(function () {
            DB::table('cache')->insert(['key' => 'k', 'value' => 'v', 'expiration' => 1]);

            throw new RuntimeException('boom');
        });
    } catch (RuntimeException) {
    }

    expect(DB::table('cache')->where('key', 'k')->exists())->toBeFalse();
});

it('retries a deadlock up to three attempts', function () {
    $attempts = 0;

    $result = WriteTransaction::run(function () use (&$attempts) {
        if (++$attempts < 3) {
            throw deadlock();
        }

        return $attempts;
    });

    expect($result)->toBe(3);
});

it('gives up after the third deadlock', function () {
    $attempts = 0;

    try {
        WriteTransaction::run(function () use (&$attempts) {
            $attempts++;

            throw deadlock();
        });
        $this->fail('expected the deadlock to surface');
    } catch (QueryException) {
        expect($attempts)->toBe(3);
    }
});
