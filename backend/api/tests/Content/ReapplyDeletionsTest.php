<?php

use App\Accounts\Ownership;
use App\Accounts\UserData;
use App\Accounts\UserPurge;
use App\Auth\AccountStatus;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\Support\PopulatedAccount;
use Tests\Support\UserDataCoverage;

beforeEach(function () {
    config(['queue.default' => 'database']);
    Carbon::setTestNow('2026-10-07 09:00:00');
    $this->ledgerPath = tempnam(sys_get_temp_dir(), 'ledger');
});

afterEach(function () {
    Carbon::setTestNow();
    @unlink($this->ledgerPath);
});

function reapplyLedger(string $path, string $contents): array
{
    file_put_contents($path, $contents);
    $exit = Artisan::call('taller:reapply-deletions', ['archivo' => $path]);

    return [$exit, Artisan::output()];
}

function reapplyRowsLeftOf(int $userId): int
{
    $left = 0;
    foreach ((new UserData)->tables() as $table) {
        $ownedByUser = in_array($table->ownership, [Ownership::UserId, Ownership::Child], true);
        if ($ownedByUser && UserDataCoverage::exists($table->name)) {
            $left += UserDataCoverage::rowsOf($table, $userId);
        }
    }

    return $left;
}

function reapplyStandardLedger(): string
{
    return "user_id\tuser_created_at\tdeleted_at\n"
        ."12\t2026-10-05 12:00:00.123\t2026-10-06 08:30:00.000\n"
        ."13\t2026-10-05 12:00:00.000\t2026-10-06 09:00:00.000\n"
        ."14\t2026-10-05 13:00:00.000\t2026-10-06 09:30:00.000\n";
}

function reapplyRestoredBase(): void
{
    PopulatedAccount::create(['id' => 12, 'created_at' => '2026-10-05 12:00:00.123']);
    User::factory()->create(['id' => 13, 'created_at' => '2026-10-06 10:00:00.000']);
}

it('purges the account that matches, leaves the one with a reused id and completes the ledger with the file values', function () {
    reapplyRestoredBase();

    [$exit, $output] = reapplyLedger($this->ledgerPath, reapplyStandardLedger());

    expect($exit)->toBe(0)
        ->and(DB::table('users')->where('id', 12)->count())->toBe(0)
        ->and(reapplyRowsLeftOf(12))->toBe(0)
        ->and(DB::table('users')->where('id', 13)->value('status'))->toBe('active')
        ->and($output)->toContain('1 cuenta borrada, 1 id reutilizado salteado y 3 filas agregadas al libro')
        ->and($output)->toContain('13')
        ->and($output)->toContain('reutilizado')
        ->and(DB::table('jobs')->count())->toBe(0);
    $ledger = DB::table('account_deletions')->orderBy('user_id')->get(['user_id', 'user_created_at', 'deleted_at'])->map(fn ($row) => (array) $row)->all();
    expect($ledger)->toBe([
        ['user_id' => 12, 'user_created_at' => '2026-10-05 12:00:00.123', 'deleted_at' => '2026-10-06 08:30:00.000'],
        ['user_id' => 13, 'user_created_at' => '2026-10-05 12:00:00.000', 'deleted_at' => '2026-10-06 09:00:00.000'],
        ['user_id' => 14, 'user_created_at' => '2026-10-05 13:00:00.000', 'deleted_at' => '2026-10-06 09:30:00.000'],
    ]);
});

it('changes nothing on a second run', function () {
    reapplyRestoredBase();
    reapplyLedger($this->ledgerPath, reapplyStandardLedger());

    [$exit, $output] = reapplyLedger($this->ledgerPath, reapplyStandardLedger());

    expect($exit)->toBe(0)
        ->and($output)->toContain('0 cuentas borradas')
        ->and($output)->toContain('0 filas agregadas')
        ->and(DB::table('account_deletions')->count())->toBe(3)
        ->and(DB::table('users')->where('id', 13)->count())->toBe(1);
});

it('prints ids and never an email', function () {
    reapplyRestoredBase();
    $emails = DB::table('users')->pluck('email')->all();

    [, $output] = reapplyLedger($this->ledgerPath, reapplyStandardLedger());

    foreach ($emails as $email) {
        expect($output)->not->toContain($email);
    }
});

it('exits 2 naming the malformed line and processes nothing', function () {
    reapplyRestoredBase();
    $contents = "12\t2026-10-05 12:00:00.123\t2026-10-06 08:30:00.000\n13\tabc\t2026-10-06 09:00:00.000\n";

    [$exit, $output] = reapplyLedger($this->ledgerPath, $contents);

    expect($exit)->toBe(2)
        ->and($output)->toContain('2')
        ->and(DB::table('users')->where('id', 12)->value('status'))->toBe('active')
        ->and(DB::table('account_deletions')->count())->toBe(0);
});

it('exits 1 when the file does not exist', function () {
    expect(Artisan::call('taller:reapply-deletions', ['archivo' => '/nonexistent/ledger.tsv']))->toBe(1);
});

it('keeps processing the other accounts when one purge fails and exits 1 naming it', function () {
    PopulatedAccount::create(['id' => 12, 'created_at' => '2026-10-05 12:00:00.000']);
    PopulatedAccount::create(['id' => 15, 'created_at' => '2026-10-05 12:00:00.000']);
    $calls = 0;
    $real = app(UserPurge::class);
    app()->bind(UserPurge::class, function () use (&$calls, $real) {
        $calls++;

        return $calls === 1 ? throw new RuntimeException('disk failure') : $real;
    });
    $contents = "12\t2026-10-05 12:00:00.000\t2026-10-06 08:30:00.000\n15\t2026-10-05 12:00:00.000\t2026-10-06 08:31:00.000\n";

    [$exit, $output] = reapplyLedger($this->ledgerPath, $contents);

    expect($exit)->toBe(1)
        ->and($output)->toContain('12')
        ->and(DB::table('users')->where('id', 12)->value('status'))->toBe(AccountStatus::Deleting->value)
        ->and(DB::table('users')->where('id', 15)->count())->toBe(0);
});

it('purges the only admin anyway and says how to create another one', function () {
    User::factory()->admin()->create(['id' => 12, 'created_at' => '2026-10-05 12:00:00.000']);

    [$exit, $output] = reapplyLedger($this->ledgerPath, "12\t2026-10-05 12:00:00.000\t2026-10-06 08:30:00.000\n");

    expect($exit)->toBe(0)
        ->and(DB::table('users')->where('id', 12)->count())->toBe(0)
        ->and($output)->toContain('admin activo')
        ->and($output)->toContain('taller:invite {email} --role=admin');
});

function reapplyNextUserId(): int
{
    return User::factory()->create()->id;
}

it('gives the next new account an id above every id of the ledger', function () {
    DB::statement('ALTER TABLE users AUTO_INCREMENT = 1');

    [$exit, $output] = reapplyLedger($this->ledgerPath, "50\t2026-10-05 12:00:00.000\t2026-10-06 08:30:00.000\n");

    expect($exit)->toBe(0)
        ->and($output)->toContain('El próximo id de cuenta será 51.')
        ->and(reapplyNextUserId())->toBe(51);
});

it('gives the next new account an id above every id of the ledger already stored', function () {
    DB::statement('ALTER TABLE users AUTO_INCREMENT = 1');
    DB::table('account_deletions')->insert(['user_id' => 70, 'user_created_at' => '2026-10-05 12:00:00.000', 'deleted_at' => '2026-10-06 08:30:00.000']);

    reapplyLedger($this->ledgerPath, "user_id\tuser_created_at\tdeleted_at\n");

    expect(reapplyNextUserId())->toBe(71);
});

it('does not lower the id counter when the ledger is empty', function () {
    DB::statement('ALTER TABLE users AUTO_INCREMENT = 500');

    [$exit] = reapplyLedger($this->ledgerPath, "user_id\tuser_created_at\tdeleted_at\n");

    expect($exit)->toBe(0)
        ->and(reapplyNextUserId())->toBe(500);
});
