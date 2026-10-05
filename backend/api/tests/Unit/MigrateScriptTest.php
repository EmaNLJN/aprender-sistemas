<?php

use Illuminate\Filesystem\Filesystem;
use Symfony\Component\Process\Process;

/**
 * Runs docker/migrate.sh with a fake `php` that answers from `$script`: one "exit code|output" line per
 * call, where a literal `\n` in the output is a line break (it simulates a console that wraps the message).
 *
 * @return array{int|null, string, int} exit code, combined output and number of `php` calls
 */
function runMigrateScript(array $script): array
{
    $directory = sys_get_temp_dir().'/migrate-script-'.bin2hex(random_bytes(6));
    mkdir($directory, 0700, true);
    file_put_contents("{$directory}/script", implode("\n", $script)."\n");
    file_put_contents("{$directory}/php", <<<'SH'
        #!/bin/sh
        n=$(cat "$FAKE_DIR/calls" 2>/dev/null || echo 0)
        n=$((n + 1))
        echo "$n" > "$FAKE_DIR/calls"
        line=$(sed -n "${n}p" "$FAKE_DIR/script")
        text=${line#*|}
        [ -n "$text" ] && printf '%b\n' "$text"
        exit "${line%%|*}"
        SH);
    chmod("{$directory}/php", 0700);

    $process = new Process(['sh', dirname(__DIR__, 2).'/docker/migrate.sh'], env: [
        'PATH' => "{$directory}:".getenv('PATH'),
        'FAKE_DIR' => $directory,
        'MIGRATE_PAUSES' => '0 0',
    ]);
    $process->run();
    $calls = (int) trim((string) @file_get_contents("{$directory}/calls"));
    (new Filesystem)->deleteDirectory($directory);

    return [$process->getExitCode(), $process->getOutput().$process->getErrorOutput(), $calls];
}

const MIGRATE_LOCK_TIMEOUT = '1|SQLSTATE[HY000]: General error: 1205 Lock wait timeout exceeded; try restarting transaction';
const MIGRATE_DEADLOCK = '1|SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying to get lock; try restarting transaction';
const MIGRATE_LOCK_TIMEOUT_WRAPPED = '1|SQLSTATE[HY000]: General  \n    error: 1205 Lock wait timeout exceeded; try restarting transaction';

it('exits 0 when the migrations and the import work, without retrying', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|checked', '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(3)->and($output)->toContain('migrated')->toContain('imported');
});

it('retries a lock wait timeout and exits 0 if the second attempt works', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|checked', MIGRATE_LOCK_TIMEOUT, '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(4)->and($output)->toContain('reintento en 0 s');
});

it('retries a deadlock in the import', function () {
    [$exit, , $calls] = runMigrateScript(['0|checked', '0|migrated', MIGRATE_DEADLOCK, '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(5);
});

it('retries even if the console splits the lock message in two indented lines, and logs it as it came out', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|checked', MIGRATE_LOCK_TIMEOUT_WRAPPED, '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(4)->and($output)->toContain('reintento en 0 s')
        ->toContain("General  \n    error: 1205");
});

it('gives up after 3 attempts', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|checked', MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT]);

    expect($exit)->toBe(1)->and($calls)->toBe(4)->and($output)->toContain('sigue fallando por bloqueos después de 3 intentos');
});

it('does not retry other errors: invalid content stops the step', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|checked', '0|migrated', '1|curriculum.json: lab.rust[0].extra: clave desconocida', '0|never']);

    expect($exit)->toBe(1)->and($calls)->toBe(3)->and($output)->toContain('clave desconocida');
});

it('stops before migrating when the long transaction check exits 1, and does not retry it', function () {
    [$exit, $output, $calls] = runMigrateScript(['1|Hay 1 transacción abierta hace más de 30 segundos', '0|migrated', '0|imported']);

    expect($exit)->toBe(1)->and($calls)->toBe(1)->and($output)->toContain('Hay 1 transacción abierta')->not->toContain('migrated');
});

it('stops before migrating when the long transaction check cannot run and exits 2', function () {
    [$exit, $output, $calls] = runMigrateScript(['2|Falta el privilegio: db-grants', '0|migrated', '0|imported']);

    expect($exit)->toBe(2)->and($calls)->toBe(1)->and($output)->toContain('db-grants')->not->toContain('migrated');
});
