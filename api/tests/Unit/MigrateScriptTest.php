<?php

use Symfony\Component\Process\Process;

// docker/migrate.sh es el paso `migrate` del despliegue: reintenta sólo ante una espera de
// bloqueo (1205) o un interbloqueo (1213), 3 intentos como mucho. Se prueba con un `php` de
// mentira, que responde lo que dice un guion (una línea «código|texto» por llamada).
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
        [ -n "$text" ] && echo "$text"
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
    array_map('unlink', glob("{$directory}/*"));
    rmdir($directory);

    return [$process->getExitCode(), $process->getOutput().$process->getErrorOutput(), $calls];
}

const MIGRATE_LOCK_TIMEOUT = '1|SQLSTATE[HY000]: General error: 1205 Lock wait timeout exceeded; try restarting transaction';
const MIGRATE_DEADLOCK = '1|SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying to get lock; try restarting transaction';

it('sale con 0 si las migraciones y el import andan, sin reintentar', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(2)->and($output)->toContain('migrated')->toContain('imported');
});

it('reintenta una espera de bloqueo vencida y sale bien si el segundo intento anda', function () {
    [$exit, $output, $calls] = runMigrateScript([MIGRATE_LOCK_TIMEOUT, '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(3)->and($output)->toContain('reintento en 0 s');
});

it('reintenta un interbloqueo del import', function () {
    [$exit, , $calls] = runMigrateScript(['0|migrated', MIGRATE_DEADLOCK, '0|migrated', '0|imported']);

    expect($exit)->toBe(0)->and($calls)->toBe(4);
});

it('se rinde después de 3 intentos', function () {
    [$exit, $output, $calls] = runMigrateScript([MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT, MIGRATE_LOCK_TIMEOUT]);

    expect($exit)->toBe(1)->and($calls)->toBe(3)->and($output)->toContain('sigue fallando por bloqueos después de 3 intentos');
});

it('no reintenta otros errores: un contenido inválido corta el paso', function () {
    [$exit, $output, $calls] = runMigrateScript(['0|migrated', '1|curriculum.json: lab.rust[0].extra: clave desconocida', '0|nunca']);

    expect($exit)->toBe(1)->and($calls)->toBe(2)->and($output)->toContain('clave desconocida');
});
