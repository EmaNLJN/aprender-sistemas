<?php

use Tests\TestCase;

// La guarda de tests/TestCase.php mira la conexión efectiva, como la arma Laravel al conectar:
// DB_URL pisa host y base, y un socket hace que MySQL ignore el host. Estas configuraciones no
// se conectan a nada.
it('acepta la base de pruebas, también la de cada proceso en paralelo', function (array $connection) {
    expect(fn () => TestCase::ensureTestDatabase($connection))->not->toThrow(Throwable::class);
})->with([
    'secuencial' => [['host' => 'mysql-test', 'database' => 'taller_test', 'unix_socket' => '', 'url' => '']],
    'paralelo' => [['host' => 'mysql-test', 'database' => 'taller_test_test_3', 'unix_socket' => '']],
]);

it('corta si la conexión efectiva no es la de pruebas', function (array $connection) {
    TestCase::ensureTestDatabase($connection);
})->with([
    'DB_URL hacia la base de desarrollo' => [['host' => 'mysql-test', 'database' => 'taller_test', 'url' => 'mysql://taller:x@mysql:3306/taller']],
    'socket' => [['host' => 'mysql-test', 'database' => 'taller_test', 'unix_socket' => '/run/mysqld/mysqld.sock']],
    'otra base' => [['host' => 'mysql-test', 'database' => 'taller']],
    'hosts de lectura y escritura' => [['host' => 'mysql-test', 'database' => 'taller_test', 'read' => ['host' => ['mysql']], 'write' => ['host' => ['mysql']]]],
    'DB_URL con lectura y escritura' => [['host' => 'mysql-test', 'database' => 'taller_test', 'url' => 'mysql://taller:x@mysql-test:3306/taller_test?read[host][]=mysql&write[host][]=mysql']],
    'otro host' => [['host' => 'mysql', 'database' => 'taller_test']],
])->throws(RuntimeException::class, 'Las pruebas sólo corren contra mysql-test/taller_test');
