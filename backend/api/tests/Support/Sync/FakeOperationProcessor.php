<?php

namespace Tests\Support\Sync;

use App\Progress\Operations\Applied;
use App\Progress\Operations\Checked;
use App\Progress\Operations\Decoded;
use App\Progress\Operations\Operation;
use App\Progress\Operations\OperationHash;
use App\Progress\Operations\OperationProcessor;
use App\Progress\Operations\OperationType;
use App\Progress\Operations\RejectionReason;
use Carbon\CarbonImmutable;
use Throwable;

final class FakeOperationProcessor implements OperationProcessor
{
    /** @var list<array{userId: int, id: string, effectiveAt: ?CarbonImmutable, revision: int, now: CarbonImmutable}> */
    public array $applied = [];

    /** @var list<list<string>> */
    public array $decodedBatches = [];

    /** @var list<string> */
    public array $contentVersionsChecked = [];

    /** @var array<string, RejectionReason> */
    public array $rejectOnDecode = [];

    /** @var array<string, RejectionReason> */
    public array $rejectOnCheck = [];

    /** @var list<string> */
    public array $staleIds = [];

    /** @var list<string> */
    public array $unchangedIds = [];

    /** @var list<Throwable> */
    private array $failures = [];

    public function failNextApplyWith(Throwable $error): void
    {
        $this->failures[] = $error;
    }

    public function decode(array $raw): array
    {
        $this->decodedBatches[] = array_map(fn (array $operation) => (string) $operation['id'], $raw);

        return array_map($this->decodeOne(...), $raw);
    }

    public function check(array $decoded, string $currentContentVersion): array
    {
        $this->contentVersionsChecked[] = $currentContentVersion;

        return array_map(fn (Decoded $one) => $this->checkOne($one), $decoded);
    }

    public function apply(int $userId, Checked $operation, ?CarbonImmutable $effectiveAt, int $revision, CarbonImmutable $now): Applied
    {
        if ($this->failures !== []) {
            throw array_shift($this->failures);
        }
        $this->applied[] = ['userId' => $userId, 'id' => $operation->id, 'effectiveAt' => $effectiveAt, 'revision' => $revision, 'now' => $now];

        return new Applied(! in_array($operation->id, $this->unchangedIds, true));
    }

    /** @param array<string, mixed> $raw */
    private function decodeOne(array $raw): Decoded
    {
        $id = (string) $raw['id'];
        $hash = OperationHash::of($raw);
        if (isset($this->rejectOnDecode[$id])) {
            return Decoded::rejected($id, $hash, $this->rejectOnDecode[$id]);
        }
        $values = array_diff_key($raw, ['id' => 1, 'type' => 1, 'at' => 1]);

        return Decoded::valid(new Operation(
            $id,
            OperationType::from((string) $raw['type']),
            CarbonImmutable::parse((string) $raw['at'])->utc(),
            $values,
            $hash,
            null,
        ));
    }

    private function checkOne(Decoded $decoded): Checked
    {
        $reason = $decoded->reason ?? $this->rejectOnCheck[$decoded->id] ?? null;
        if ($reason !== null || $decoded->operation === null) {
            return Checked::rejected($decoded->id, $decoded->hash, $reason ?? RejectionReason::Invalid);
        }

        return Checked::ready($decoded->operation, in_array($decoded->id, $this->staleIds, true));
    }
}
