<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\ConfigurationUrlParser;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Corta antes de cualquier operación de base: refreshApplication corre antes de que
     * ParallelTesting cree o borre bases y antes de que RefreshDatabase o DatabaseTruncation
     * corran migrate:fresh en setUpTraits.
     */
    protected function refreshApplication()
    {
        parent::refreshApplication();

        $config = $this->app['config'];
        $connection = $config->get('database.default');
        static::ensureTestDatabase($config->get("database.connections.{$connection}", []));
    }

    /**
     * Mira la conexión efectiva, como la arma Laravel al conectar: DB_URL pisa host y base, y un
     * socket hace que MySQL ignore el host.
     *
     * @param  array<string, mixed>  $connection
     */
    public static function ensureTestDatabase(array $connection): void
    {
        $effective = (new ConfigurationUrlParser)->parseConfiguration($connection);
        $host = $effective['host'] ?? null;
        $database = (string) ($effective['database'] ?? '');
        $socket = (string) ($effective['unix_socket'] ?? '');
        // ConnectionFactory usa los hosts de `read` y `write` cuando existen, en lugar de `host`.
        if (isset($effective['read']) || isset($effective['write'])) {
            throw new RuntimeException('Las pruebas sólo corren contra mysql-test/taller_test; la conexión efectiva define hosts propios de lectura o escritura.');
        }
        if ($host !== 'mysql-test' || $socket !== '' || ! str_starts_with($database, 'taller_test')) {
            $where = $socket !== '' ? "el socket {$socket}" : "{$host}/{$database}";
            throw new RuntimeException("Las pruebas sólo corren contra mysql-test/taller_test; la conexión efectiva apunta a {$where}.");
        }
    }
}
