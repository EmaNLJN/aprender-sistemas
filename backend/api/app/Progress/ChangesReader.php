<?php

namespace App\Progress;

interface ChangesReader
{
    /** Runs inside the transaction of the caller. A null revision is the full snapshot; a number, what changed since it. */
    public function areas(int $userId, ?int $sinceRevision): ProgressAreas;
}
