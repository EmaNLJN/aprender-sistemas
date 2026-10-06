<?php

namespace Tests\Support;

use Closure;
use Illuminate\Support\Facades\Concurrency;
use Tests\TestCase;

final class Parallel
{
    /**
     * @param  array<string|int, Closure(): mixed>  $tasks
     * @return array<string|int, mixed>
     */
    public static function run(array $tasks): array
    {
        $guarded = [];
        foreach ($tasks as $key => $task) {
            // A closure written in a Pest file is scoped to a test class that the child process cannot autoload.
            $unscoped = Closure::bind($task, null, null);
            $guarded[$key] = static function () use ($unscoped): mixed {
                TestCase::ensureTestDatabase(config('database.connections.'.config('database.default')));

                return $unscoped();
            };
        }

        return Concurrency::run($guarded, timeout: 60);
    }
}
