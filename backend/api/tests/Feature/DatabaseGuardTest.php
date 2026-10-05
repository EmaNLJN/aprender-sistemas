<?php

use Tests\TestCase;

it('accepts the test database, also the one of each parallel process', function (array $connection) {
    expect(fn () => TestCase::ensureTestDatabase($connection))->not->toThrow(Throwable::class);
})->with([
    'sequential' => [['host' => 'mysql-test', 'database' => 'taller_test', 'unix_socket' => '', 'url' => '']],
    'parallel' => [['host' => 'mysql-test', 'database' => 'taller_test_test_3', 'unix_socket' => '']],
]);

it('rejects a connection that is not the test one', function (array $connection) {
    TestCase::ensureTestDatabase($connection);
})->with([
    'DB_URL to the development database' => [['host' => 'mysql-test', 'database' => 'taller_test', 'url' => 'mysql://taller:x@mysql:3306/taller']],
    'socket' => [['host' => 'mysql-test', 'database' => 'taller_test', 'unix_socket' => '/run/mysqld/mysqld.sock']],
    'another database' => [['host' => 'mysql-test', 'database' => 'taller']],
    'read and write hosts' => [['host' => 'mysql-test', 'database' => 'taller_test', 'read' => ['host' => ['mysql']], 'write' => ['host' => ['mysql']]]],
    'DB_URL with read and write hosts' => [['host' => 'mysql-test', 'database' => 'taller_test', 'url' => 'mysql://taller:x@mysql-test:3306/taller_test?read[host][]=mysql&write[host][]=mysql']],
    'another host' => [['host' => 'mysql', 'database' => 'taller_test']],
])->throws(RuntimeException::class, 'Las pruebas sólo corren contra mysql-test/taller_test');
