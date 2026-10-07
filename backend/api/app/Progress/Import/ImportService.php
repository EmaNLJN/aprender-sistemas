<?php

namespace App\Progress\Import;

use App\Content\ContentImports;
use App\Progress\AccountLock;
use App\Progress\ChangesReader;
use App\Progress\ContentNotImported;
use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\Legacy\ReportEntry;
use App\Progress\ProgressHead;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

final class ImportService
{
    private const REPLACEMENT_CHARACTER = "\u{FFFD}";

    public function __construct(
        private AccountLock $lock,
        private ImportContent $content,
        private LegacyDecoder $decoder,
        private LegacyWriter $writer,
        private ChangesReader $current,
        private ImportLedger $ledger,
        private ContentImports $imports,
    ) {}

    /**
     * @throws ClientOutdated
     * @throws ContentNotImported
     * @throws EpochMismatch
     * @throws ValidationException
     * @throws ImportNeedsConfirmation
     * @throws ImportWriteFailed
     */
    public function import(int $userId, ImportRequest $request): ImportOutcome
    {
        $startedAt = microtime(true);
        $this->assertAcceptable($userId, $request);
        $progress = $this->decoder->decode($request->normalized, $this->content->factsFor($request->normalized));
        $rawSha256 = hash('sha256', $request->raw);
        $now = Instant::now();

        try {
            $outcome = $this->lock->within($userId, fn (ProgressHead $head) => $this->apply($head, $request, $progress, $rawSha256, $now));
        } catch (QueryException $error) {
            throw ImportWriteFailed::from($error);
        }
        $outcome->repeated
            ? ImportLog::repeated($userId, $request, $outcome, $startedAt)
            : ImportLog::applied($userId, $request, $outcome, $startedAt);

        return $outcome;
    }

    private function assertAcceptable(int $userId, ImportRequest $request): void
    {
        if (! in_array($request->format, config()->array('progress.import.formats'), true)) {
            throw new ClientOutdated;
        }
        if ($this->imports->latestVersion() === null) {
            throw new ContentNotImported;
        }
        $head = $this->lock->peek($userId);
        if ($head->epoch !== $request->epoch) {
            throw new EpochMismatch($head->epoch, $head->revision);
        }
    }

    private function apply(ProgressHead $head, ImportRequest $request, LegacyProgress $progress, string $rawSha256, CarbonImmutable $now): ImportOutcome
    {
        if ($head->epoch !== $request->epoch) {
            throw new EpochMismatch($head->epoch, $head->revision);
        }
        $earlier = $this->earlierImport($head, $request, $rawSha256);
        if ($earlier !== null) {
            return new ImportOutcome(true, $earlier);
        }
        if (! $request->confirm && $this->ledger->needsConfirmation($head, $rawSha256)) {
            throw new ImportNeedsConfirmation;
        }

        $conflicts = ImportConflicts::between($progress, $this->current->areas($head->userId, null));
        $written = $this->writer->write($head->userId, $head->epoch, $progress, $head->revision + 1, $now);
        $revision = $written->changed() ? $this->lock->advance($head, $now)->revision : $head->revision;
        $report = new ImportReport($written->counts, $progress->omitted, $this->replaced($request, $progress), $conflicts);

        return new ImportOutcome(false, $this->ledger->record($head->userId, $request, $rawSha256, $report, $head->epoch, $revision, $now));
    }

    private function earlierImport(ProgressHead $head, ImportRequest $request, string $rawSha256): ?StoredImport
    {
        $sameId = $this->ledger->byImportId($head->userId, $request->importId);
        if ($sameId === null) {
            return $this->ledger->byRawInEpoch($head->userId, $rawSha256, $head->epoch);
        }
        if ($sameId->rawSha256 !== $rawSha256 || $sameId->epoch !== $head->epoch) {
            throw ValidationException::withMessages(['importId' => ['La importId ya se usó con otra copia o en una época anterior.']]);
        }

        return $sameId;
    }

    /** @return list<ReportEntry> */
    private function replaced(ImportRequest $request, LegacyProgress $progress): array
    {
        return str_contains($request->raw, self::REPLACEMENT_CHARACTER)
            ? [new ReportEntry('raw', 'replacement_character'), ...$progress->replaced]
            : $progress->replaced;
    }
}
