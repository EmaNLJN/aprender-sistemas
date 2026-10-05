<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\ConfigurationUrlParser;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    // Runs before ParallelTesting touches databases and before migrate:fresh in setUpTraits.
    protected function refreshApplication()
    {
        parent::refreshApplication();

        $config = $this->app['config'];
        $connection = $config->get('database.default');
        static::ensureTestDatabase($config->get("database.connections.{$connection}", []));
    }

    /**
     * @param  array<string, mixed>  $connection
     */
    public static function ensureTestDatabase(array $connection): void
    {
        $effective = (new ConfigurationUrlParser)->parseConfiguration($connection);
        $host = $effective['host'] ?? null;
        $database = (string) ($effective['database'] ?? '');
        $socket = (string) ($effective['unix_socket'] ?? '');
        // `read`/`write` hosts replace `host` in ConnectionFactory.
        if (isset($effective['read']) || isset($effective['write'])) {
            throw new RuntimeException('Tests only run against mysql-test/taller_test; the effective connection defines its own read or write hosts.');
        }
        if ($host !== 'mysql-test' || $socket !== '' || ! str_starts_with($database, 'taller_test')) {
            $where = $socket !== '' ? "socket {$socket}" : "{$host}/{$database}";
            throw new RuntimeException("Tests only run against mysql-test/taller_test; the effective connection points to {$where}.");
        }
    }
}
