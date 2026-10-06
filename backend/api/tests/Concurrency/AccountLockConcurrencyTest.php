<?php

use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\Record\Instant;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Tests\Support\Parallel;
use Tests\Support\RunWorld;

function runningIsolation(): string
{
    // information_schema.innodb_trx is a cache that MySQL refreshes at most every 100 ms.
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $row = DB::selectOne('select trx_isolation_level as level from information_schema.innodb_trx where trx_mysql_thread_id = connection_id()');
        if ($row !== null) {
            return (string) $row->level;
        }
        usleep(120000);
    }

    throw new RuntimeException('The transaction does not appear in innodb_trx.');
}

it('runs the work in READ COMMITTED, as the transaction itself reports it', function () {
    $user = RunWorld::user();

    $level = (new AccountLock)->within($user->id, fn () => runningIsolation());

    expect($level)->toBe('READ COMMITTED');
});

it('keeps READ COMMITTED on the attempt that follows a deadlock', function () {
    $user = RunWorld::user();
    $levels = [];

    (new AccountLock)->within($user->id, function () use (&$levels) {
        $levels[] = runningIsolation();
        if (count($levels) === 1) {
            throw new QueryException('mysql', 'select 1', [], new PDOException('Deadlock found when trying to get lock; try restarting transaction'));
        }
    });

    expect($levels)->toBe(['READ COMMITTED', 'READ COMMITTED']);
});

it('serializes twenty concurrent writers of one account: no lost updates', function () {
    $userId = RunWorld::user()->id;

    $writers = [];
    foreach (range(1, 20) as $writer) {
        $writers[] = function () use ($userId): int {
            $lock = new AccountLock;

            return $lock->within($userId, fn (ProgressHead $head) => $lock->advance($head, Instant::now())->revision);
        };
    }

    $revisions = Parallel::run($writers);
    sort($revisions);

    expect($revisions)->toBe(range(1, 20))
        ->and((int) DB::table('progress_heads')->where('user_id', $userId)->value('revision'))->toBe(20);
});

it('does not make the lock of one account wait for the lock of another', function () {
    $accountA = RunWorld::user()->id;
    $accountB = RunWorld::user()->id;

    $results = Parallel::run([
        'holder' => function () use ($accountA): bool {
            return (new AccountLock)->within($accountA, function () {
                DB::build(config('database.connections.'.config('database.default')))->table('cache')->insert(['key' => 'a-holding', 'value' => '1', 'expiration' => 2000000000]);
                $deadline = microtime(true) + 20;
                while (microtime(true) < $deadline) {
                    if (DB::build(config('database.connections.'.config('database.default')))->table('cache')->where('key', 'b-done')->exists()) {
                        return true;
                    }
                    usleep(50000);
                }

                return false;
            });
        },
        'other' => function () use ($accountB): bool {
            $deadline = microtime(true) + 20;
            while (! DB::table('cache')->where('key', 'a-holding')->exists()) {
                if (microtime(true) > $deadline) {
                    return false;
                }
                usleep(50000);
            }
            (new AccountLock)->within($accountB, fn () => null);
            DB::table('cache')->insert(['key' => 'b-done', 'value' => '1', 'expiration' => 2000000000]);

            return true;
        },
    ]);

    expect($results)->toBe(['holder' => true, 'other' => true]);
});
