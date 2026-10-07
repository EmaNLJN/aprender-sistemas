<?php

namespace App\Progress\Operations;

use Carbon\CarbonImmutable;

interface OperationProcessor
{
    /**
     * Shape, types, ranges and lengths, without the database. One result per raw operation, in the same order.
     *
     * @param  list<array<string, mixed>>  $raw  each with a UUID v4 id, a text type and a valid at
     * @return list<Decoded>
     */
    public function decode(array $raw): array;

    /**
     * References to the content and the ranges that depend on it, and whether each answer was given with the current version.
     * Reads content tables, outside the lock of the account.
     *
     * @param  list<Decoded>  $decoded
     * @return list<Checked>
     */
    public function check(array $decoded, string $currentContentVersion): array;

    /**
     * Writes a checked operation of the account with the rules of its fields, inside the transaction of the account.
     * $effectiveAt is the corrected clock (null in an import without a clock); $revision is the one the transaction will leave.
     */
    public function apply(int $userId, Checked $operation, ?CarbonImmutable $effectiveAt, int $revision, CarbonImmutable $now): Applied;
}
