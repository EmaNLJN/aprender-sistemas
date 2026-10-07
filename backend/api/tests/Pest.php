<?php

use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

// content:import and DDL commit their own transactions, so these tests truncate instead of
// rolling back (ADR 0004).
pest()->extend(TestCase::class)
    ->use(DatabaseTruncation::class)
    ->in('Content');

function useSampleBlockedPasswords(): void
{
    config(['taller.password_blocklist' => base_path('tests/Support/fixtures/blocked-sample.txt')]);
}
