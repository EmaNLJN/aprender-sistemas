<?php

use App\Models\Invitation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

function insertSessions(int $count, int $lastActivity): void
{
    foreach (array_chunk(range(1, $count), 500) as $chunk) {
        DB::table('sessions')->insert(array_map(fn (int $n) => [
            'id' => "s{$lastActivity}-{$n}",
            'payload' => '',
            'last_activity' => $lastActivity,
        ], $chunk));
    }
}

function insertCacheRows(string $table, int $count, string $prefix, int $expiration): void
{
    foreach (array_chunk(range(1, $count), 500) as $chunk) {
        DB::table($table)->insert(array_map(fn (int $n) => array_filter([
            'key' => "{$prefix}-{$n}",
            'value' => $table === 'cache' ? 'v' : null,
            'owner' => $table === 'cache_locks' ? 'o' : null,
            'expiration' => $expiration,
        ], fn ($value) => $value !== null), $chunk));
    }
}

/** @return list<string> */
function capturedDeletes(Closure $body): array
{
    $statements = [];
    DB::listen(function ($query) use (&$statements) {
        if (str_starts_with($query->sql, 'delete from')) {
            $statements[] = $query->sql;
        }
    });
    $body();

    return $statements;
}

beforeEach(function () {
    CarbonImmutable::setTestNow('2026-10-05 12:00:00');
    config(['session.lifetime' => 30]);
});

it('prunes expired sessions in batches of 1000 with order by and limit, and keeps the live ones', function () {
    $cutoff = now()->timestamp - 30 * 60;
    insertSessions(2500, $cutoff - 3600);
    insertSessions(10, now()->timestamp);

    $deletes = capturedDeletes(fn () => $this->artisan('taller:prune-sessions')->assertExitCode(0));

    expect(DB::table('sessions')->count())->toBe(10)
        ->and(count($deletes))->toBeGreaterThanOrEqual(3);
    foreach ($deletes as $sql) {
        expect($sql)->toContain('from `sessions`')->toContain('order by `last_activity`')->toContain('limit 1000');
    }
});

it('deletes a session exactly at the cutoff and keeps one a second newer', function () {
    $cutoff = now()->timestamp - 30 * 60;
    DB::table('sessions')->insert([
        ['id' => 'at-cutoff', 'payload' => '', 'last_activity' => $cutoff],
        ['id' => 'one-second-newer', 'payload' => '', 'last_activity' => $cutoff + 1],
    ]);

    $this->artisan('taller:prune-sessions')->assertExitCode(0);

    expect(DB::table('sessions')->pluck('id')->all())->toBe(['one-second-newer']);
});

it('prunes expired cache and lock rows in batches of 1000 and keeps the live ones, content bodies included', function () {
    $now = now()->timestamp;
    foreach (['cache', 'cache_locks'] as $table) {
        insertCacheRows($table, 3000, "{$table}-expired", $now - 10);
        insertCacheRows($table, 5, "{$table}-live", $now + 60);
    }
    insertCacheRows('cache', 1, 'content-body:lab', $now + 30 * 86400);

    $deletes = capturedDeletes(fn () => $this->artisan('taller:prune-cache')->assertExitCode(0));

    expect(DB::table('cache')->count())->toBe(6)
        ->and(DB::table('cache')->where('key', 'content-body:lab-1')->exists())->toBeTrue()
        ->and(DB::table('cache_locks')->count())->toBe(5)
        ->and(count($deletes))->toBeGreaterThanOrEqual(6);
    foreach ($deletes as $sql) {
        expect($sql)->toContain('order by `expiration`')->toContain('limit 1000');
    }
});

it('prunes invitations that expired more than 30 days ago and not those from 29 days ago or still valid', function () {
    foreach (['expired-31' => -31, 'expired-29' => -29, 'valid' => 7] as $label => $days) {
        Invitation::forceCreate([
            'email' => "{$label}@example.com",
            'role' => 'student',
            'token_hash' => hash('sha256', $label),
            'delivery' => 'link',
            'created_at' => now()->subDays(60),
            'expires_at' => now()->addDays($days),
        ]);
    }

    $this->artisan('model:prune', ['--model' => Invitation::class])->assertExitCode(0);

    expect(Invitation::orderBy('email')->pluck('email')->all())->toBe(['expired-29@example.com', 'valid@example.com']);
});
