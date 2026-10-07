<?php

namespace Tests\Support;

use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;

/** A MySQL user created through root with only the privileges asked for (never PROCESS), and dropped on close. */
final class RestrictedMysqlUser
{
    private function __construct(
        private readonly string $name,
        public readonly Connection $connection,
    ) {}

    /** @param list<string> $grants privilege clauses such as "SELECT ON performance_schema.events_transactions_current" */
    public static function create(array $grants): self
    {
        $name = 'taller_j_'.bin2hex(random_bytes(4));
        $password = bin2hex(random_bytes(8));
        DB::statement("CREATE USER '{$name}'@'%' IDENTIFIED BY '{$password}'");
        foreach ($grants as $grant) {
            DB::statement("GRANT {$grant} TO '{$name}'@'%'");
        }
        $config = array_merge(
            DB::connection()->getConfig(),
            ['username' => $name, 'password' => $password, 'database' => ''],
        );

        return new self($name, DB::connectUsing("restricted_{$name}", $config, true));
    }

    public function close(): void
    {
        $this->connection->disconnect();
        DB::statement("DROP USER IF EXISTS '{$this->name}'@'%'");
    }
}
