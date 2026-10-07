<?php

namespace App\Progress\Import;

use App\Content\Record\RowFields;
use App\Progress\ProgressHead;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use stdClass;

final class ImportLedger
{
    private const STORED_COLUMNS = ['import_id', 'raw_sha256', 'report', 'epoch', 'revision', 'imported_at'];

    public function byImportId(int $userId, string $importId): ?StoredImport
    {
        $row = DB::table('progress_imports')->where('user_id', $userId)->where('import_id', $importId)->first(self::STORED_COLUMNS);

        return $row instanceof stdClass ? self::stored($row) : null;
    }

    public function byRawInEpoch(int $userId, string $rawSha256, int $epoch): ?StoredImport
    {
        $row = DB::table('progress_imports')
            ->where('user_id', $userId)->where('raw_sha256', $rawSha256)->where('epoch', $epoch)
            ->orderBy('id')
            ->first(self::STORED_COLUMNS);

        return $row instanceof stdClass ? self::stored($row) : null;
    }

    public function needsConfirmation(ProgressHead $head, string $rawSha256): bool
    {
        return $head->resetAt !== null
            || DB::table('progress_imports')->where('user_id', $head->userId)->where('raw_sha256', '<>', $rawSha256)->exists()
            || DB::table('progress_imports')->where('raw_sha256', $rawSha256)->where('user_id', '<>', $head->userId)->exists();
    }

    public function record(int $userId, ImportRequest $request, string $rawSha256, ImportReport $report, int $epoch, int $revision, CarbonImmutable $at): StoredImport
    {
        DB::table('progress_imports')->insert([
            'user_id' => $userId,
            'import_id' => $request->importId,
            'source' => $request->source->value,
            'raw_payload' => $request->raw,
            'raw_sha256' => $rawSha256,
            'report' => json_encode($report->toArray(), JSON_THROW_ON_ERROR),
            'epoch' => $epoch,
            'revision' => $revision,
            'imported_at' => Instant::format($at),
        ]);

        return new StoredImport($request->importId, $rawSha256, $epoch, $revision, $at, $report);
    }

    private static function stored(stdClass $row): StoredImport
    {
        $fields = new RowFields(get_object_vars($row), 'progress_imports');

        return new StoredImport(
            $fields->string('import_id'),
            $fields->string('raw_sha256'),
            $fields->int('epoch'),
            $fields->int('revision'),
            Instant::parse($fields->string('imported_at')),
            ImportReport::fromJson($fields->string('report')),
        );
    }
}
