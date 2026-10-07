<?php

use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

// content:import and DDL commit their own transactions, so these tests truncate instead of
// rolling back (ADR 0004). They also truncate after each test: DatabaseTruncation only clears
// before, and in random order a RefreshDatabase test may come next and expect an empty database.
pest()->extend(TestCase::class)
    ->use(DatabaseTruncation::class)
    ->afterEach(fn () => $this->truncateTablesForAllConnections())
    ->in('Content');

// Concurrency tests commit from several processes, so they truncate instead of rolling back.
pest()->extend(TestCase::class)
    ->use(DatabaseTruncation::class)
    ->afterEach(fn () => $this->truncateTablesForAllConnections())
    ->in('Concurrency');

function useSampleBlockedPasswords(): void
{
    config(['taller.password_blocklist' => base_path('tests/Support/fixtures/blocked-sample.txt')]);
}
