<?php

namespace App\Progress\Sync;

use App\Content\ContentImports;
use App\Progress\AccountLock;
use App\Progress\ChangesReader;
use App\Progress\ContentNotImported;
use App\Progress\Operations\Checked;
use App\Progress\Operations\OperationProcessor;
use App\Progress\Operations\RejectionReason;
use App\Progress\ProgressHead;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use LogicException;

final class SyncService
{
    public function __construct(
        private AccountLock $lock,
        private OperationProcessor $processor,
        private ChangesReader $changes,
        private OperationRegistry $registry,
        private ContentImports $content,
    ) {}

    /**
     * @throws ClientOutdated
     * @throws ContentNotImported
     * @throws EpochMismatch
     * @throws SyncWriteFailed
     */
    public function sync(int $userId, SyncRequest $request): SyncOutcome
    {
        if (! in_array($request->format, config()->array('progress.sync.formats'), true)) {
            throw new ClientOutdated;
        }
        $contentVersion = $this->content->latestVersion() ?? throw new ContentNotImported;
        $checked = $this->processor->check($this->processor->decode($request->operations), $contentVersion);
        $received = Instant::now();

        try {
            return $this->lock->within($userId, fn (ProgressHead $head) => $this->apply($head, $request, $checked, $contentVersion, $received));
        } catch (QueryException $error) {
            throw SyncWriteFailed::from($error);
        }
    }

    /** @param list<Checked> $checked */
    private function apply(ProgressHead $head, SyncRequest $request, array $checked, string $contentVersion, CarbonImmutable $received): SyncOutcome
    {
        if ($head->epoch !== $request->epoch) {
            throw new EpochMismatch($head->epoch, $head->revision);
        }
        $known = $this->registry->lookup($head->userId, array_map(fn (Checked $operation) => $operation->id, $checked));
        $processed = $this->process($head->userId, $checked, $known, $request, $received, $head->revision + 1);
        $this->registry->record($head->userId, $processed->records, ClockCorrection::offsetMs($request->sentAt, $received), $received);
        if ($processed->changed) {
            $head = $this->lock->advance($head, $received);
        }
        $full = $request->knownRevision === 0 || $request->knownContentVersion !== $contentVersion || $request->knownRevision > $head->revision;
        $areas = $this->changes->areas($head->userId, $full ? null : $request->knownRevision);

        return new SyncOutcome($head->epoch, $head->revision, $received, $contentVersion, $processed->results, $areas, $full);
    }

    /**
     * @param  list<Checked>  $checked
     * @param  array<string, RegisteredOperation>  $known
     */
    private function process(int $userId, array $checked, array $known, SyncRequest $request, CarbonImmutable $received, int $revision): ProcessedBatch
    {
        $results = [];
        $records = [];
        $changed = false;
        foreach ($checked as $operation) {
            $earlier = $known[$operation->id] ?? null;
            if ($earlier !== null) {
                $results[] = $this->repeated($operation, $earlier);

                continue;
            }
            $settlement = $this->settle($userId, $operation, $request, $received, $revision);
            $results[] = $settlement->result;
            $records[] = $settlement->record;
            $known[$operation->id] = $settlement->record;
            $changed = $changed || $settlement->changed;
        }

        return new ProcessedBatch($results, $records, $changed);
    }

    private function repeated(Checked $operation, RegisteredOperation $earlier): OperationResult
    {
        return $earlier->hash === $operation->hash
            ? new OperationResult($operation->id, ResultStatus::Duplicate, $earlier->reason)
            : new OperationResult($operation->id, ResultStatus::UuidReused);
    }

    private function settle(int $userId, Checked $checked, SyncRequest $request, CarbonImmutable $received, int $revision): Settlement
    {
        if ($checked->operation === null) {
            return Settlement::rejected($checked, $checked->reason ?? throw new LogicException('Una operación rechazada trae su motivo.'));
        }
        $effectiveAt = ClockCorrection::effective($checked->operation->at, $request->sentAt, $received);
        if ($effectiveAt->lessThan(CarbonImmutable::parse(config()->string('progress.sync.clock_floor')))) {
            return Settlement::rejected($checked, RejectionReason::OutOfRange);
        }

        return Settlement::applied($checked, $this->processor->apply($userId, $checked, $effectiveAt, $revision, $received)->changed);
    }
}
