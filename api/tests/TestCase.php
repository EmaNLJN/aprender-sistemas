<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Corta antes de que RefreshDatabase (o DatabaseTruncation) toque una base que no sea la de
     * pruebas: los dos corren migrate:fresh en setUpTraits, antes del cuerpo de la prueba.
     */
    protected function setUpTraits()
    {
        $connection = config('database.default');
        $host = config("database.connections.{$connection}.host");
        $database = (string) config("database.connections.{$connection}.database");
        if ($host !== 'mysql-test' || ! str_starts_with($database, 'taller_test')) {
            throw new RuntimeException("Las pruebas sólo corren contra mysql-test/taller_test; la configuración apunta a {$host}/{$database}.");
        }

        return parent::setUpTraits();
    }
}
