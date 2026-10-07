<?php

namespace Tests\Support\Import;

use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\LegacyWriter;
use App\Progress\Import\WrittenRows;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Throwable;

final class FakeLegacyWriter implements LegacyWriter
{
    /** @var list<array{userId: int, epoch: int, progress: LegacyProgress, revision: int, now: CarbonImmutable, headRevision: int, transactionLevel: int}> */
    public array $calls = [];

    /** @var list<Throwable> */
    private array $failures = [];

    /** @param array<string, int> $counts */
    public function __construct(public array $counts = [])
    {
    }

    public function failNextWriteWith(Throwable $error): void
    {
        $this->failures[] = $error;
    }

    public function write(int $userId, int $epoch, LegacyProgress $progress, int $revision, CarbonImmutable $now): WrittenRows
    {
        $headRevision = DB::table('progress_heads')->where('user_id', $userId)->value('revision');
        $this->calls[] = [
            'userId' => $userId, 'epoch' => $epoch, 'progress' => $progress, 'revision' => $revision, 'now' => $now,
            'headRevision' => is_int($headRevision) ? $headRevision : -1, 'transactionLevel' => DB::transactionLevel(),
        ];
        $failure = array_shift($this->failures);
        if ($failure !== null) {
            throw $failure;
        }

        return new WrittenRows([...array_fill_keys(WrittenRows::AREAS, 0), ...$this->counts]);
    }
}
