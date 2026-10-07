<?php

use App\Accounts\DeletionLedgerFile;
use App\Accounts\LedgerEntry;
use App\Accounts\MalformedLedger;

it('reads the rows, ignoring the header and the empty lines', function () {
    $contents = "user_id\tuser_created_at\tdeleted_at\n12\t2026-10-05 12:00:00.123\t2026-10-06 08:30:00.000\n\n13\t2026-10-05 12:00:00\t2026-10-06 09:00:00\n";

    $entries = (new DeletionLedgerFile)->parse($contents);

    expect($entries)->toHaveCount(2)
        ->and($entries[0])->toBeInstanceOf(LedgerEntry::class)
        ->and($entries[0]->userId)->toBe(12)
        ->and($entries[0]->userCreatedAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:00:00.123')
        ->and($entries[0]->deletedAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-06 08:30:00.000')
        ->and($entries[1]->userId)->toBe(13)
        ->and($entries[1]->userCreatedAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:00:00.000')
        ->and($entries[1]->deletedAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-06 09:00:00.000');
});

it('reads a file without a header and with Windows line endings', function () {
    $entries = (new DeletionLedgerFile)->parse("7\t2026-10-05 12:00:00.5\t2026-10-06 08:30:00\r\n");

    expect($entries)->toHaveCount(1)
        ->and($entries[0]->userCreatedAt->format('Y-m-d H:i:s.v'))->toBe('2026-10-05 12:00:00.500');
});

function ledgerMalformedLines(string $contents): array
{
    try {
        (new DeletionLedgerFile)->parse($contents);
    } catch (MalformedLedger $error) {
        return $error->lines;
    }

    return [];
}

it('names the line of a malformed row', function (string $row) {
    expect(ledgerMalformedLines($row))->toBe([1]);
})->with([
    'instant that is not a date' => ["12\tabc\t2026-10-06 08:30:00"],
    'two columns' => ["12\t2026-10-05 12:00:00"],
    'four columns' => ["12\t2026-10-05 12:00:00\t2026-10-06 08:30:00\textra"],
    'id zero' => ["0\t2026-10-05 12:00:00\t2026-10-06 08:30:00"],
    'negative id' => ["-3\t2026-10-05 12:00:00\t2026-10-06 08:30:00"],
    'id that is not a number' => ["x\t2026-10-05 12:00:00\t2026-10-06 08:30:00"],
    'instant without time' => ["12\t2026-10-05\t2026-10-06 08:30:00"],
    'impossible date' => ["12\t2026-13-45 12:00:00\t2026-10-06 08:30:00"],
    'seven decimals' => ["12\t2026-10-05 12:00:00.1234567\t2026-10-06 08:30:00"],
]);

it('reports every malformed line, counting the header and the empty lines', function () {
    $contents = "user_id\tuser_created_at\tdeleted_at\n12\tabc\t2026-10-06 08:30:00\n\n13\t2026-10-05 12:00:00\t2026-10-06 09:00:00\n0\t2026-10-05 12:00:00\t2026-10-06 09:00:00\n14\t2026-10-05 12:00:00\n";

    expect(ledgerMalformedLines($contents))->toBe([2, 5, 6]);
});
