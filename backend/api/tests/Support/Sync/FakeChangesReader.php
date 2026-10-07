<?php

namespace Tests\Support\Sync;

use App\Progress\ChangesReader;
use App\Progress\ProgressAreas;
use Illuminate\Support\Facades\DB;

final class FakeChangesReader implements ChangesReader
{
    /** @var list<array{userId: int, sinceRevision: ?int, headRevision: int, transactionLevel: int}> */
    public array $calls = [];

    public function __construct(public ProgressAreas $areas = new ProgressAreas) {}

    public function areas(int $userId, ?int $sinceRevision): ProgressAreas
    {
        $headRevision = DB::table('progress_heads')->where('user_id', $userId)->value('revision');
        $this->calls[] = [
            'userId' => $userId,
            'sinceRevision' => $sinceRevision,
            'headRevision' => is_int($headRevision) ? $headRevision : -1,
            'transactionLevel' => DB::transactionLevel(),
        ];

        return $this->areas;
    }
}
