<?php

namespace App\Progress\Merge;

use App\Progress\Operations\Applied;
use App\Progress\Operations\Checked;
use App\Progress\Operations\FieldKind;
use App\Progress\Operations\FieldKinds;
use App\Progress\Operations\FieldType;
use App\Progress\Operations\Operation;
use App\Progress\Operations\OperationCatalog;
use App\Progress\Operations\OperationSpec;
use App\Progress\Operations\OperationType;
use App\Progress\Operations\Rule;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use LogicException;

final class OperationWriter
{
    private const OPERATIONS_WITH_PARENT = [OperationType::WorkshopObjective, OperationType::WorkshopStep];

    public function write(int $userId, Checked $checked, ?CarbonImmutable $effectiveAt, int $revision, CarbonImmutable $now): Applied
    {
        $operation = $checked->operation ?? throw new LogicException('Una operación rechazada no se escribe.');
        $spec = OperationCatalog::spec($operation->type);
        $key = $this->key($spec, $operation);

        $parentCreated = false;
        if (in_array($operation->type, self::OPERATIONS_WITH_PARENT, true)) {
            $parentCreated = $this->createWorkshopParent($userId, $key, $revision, $now);
        }
        $statement = UpsertSql::row($userId, $key, $this->writes($spec, $operation, $checked->stale, $effectiveAt), $revision, $now);
        $affected = DB::affectingStatement($statement->sql, $statement->bindings);

        return new Applied($parentCreated || $affected > 0);
    }

    /**
     * @param  array<string, string>  $key
     */
    private function createWorkshopParent(int $userId, array $key, int $revision, CarbonImmutable $now): bool
    {
        $statement = UpsertSql::workshopParent($userId, $key['workshop_id'], $key['language'], $revision, $now);

        return DB::affectingStatement($statement->sql, $statement->bindings) === 1;
    }

    /** @return array<string, string> */
    private function key(OperationSpec $spec, Operation $operation): array
    {
        $key = [];
        foreach ($spec->keyColumns as $column => $field) {
            $key[$column] = (string) $operation->values[$field];
        }

        return $key;
    }

    /** @return non-empty-list<FieldWrite> */
    private function writes(OperationSpec $spec, Operation $operation, bool $stale, ?CarbonImmutable $effectiveAt): array
    {
        $writes = [];
        foreach (FieldKinds::writtenBy($operation->type) as $name) {
            $kind = FieldKinds::definition($name);
            if ($this->isWritten($kind, $operation, $stale)) {
                $writes[] = new FieldWrite($kind, $this->values($spec, $kind, $operation), $kind->clockColumn === null ? null : $effectiveAt);
            }
        }

        return $writes === [] ? throw new LogicException('Una operación comprobada escribe al menos un tipo de campo.') : $writes;
    }

    private function isWritten(FieldKind $kind, Operation $operation, bool $stale): bool
    {
        if ($kind->selector !== null && ($operation->values[$kind->selector[0]] ?? null) !== $kind->selector[1]) {
            return false;
        }

        return match ($kind->rule) {
            Rule::DatedFlag => ! $stale && ($operation->values[$kind->wireFields[0]] ?? null) === true,
            Rule::FlagOr => ($operation->values[$kind->wireFields[0]] ?? null) === true,
            default => true,
        };
    }

    /** @return list<string|int|null> */
    private function values(OperationSpec $spec, FieldKind $kind, Operation $operation): array
    {
        $values = [];
        foreach ($kind->wireFields as $field) {
            $values[] = $this->databaseValue($spec, $field, $operation->values[$field]);
        }

        return $values;
    }

    private function databaseValue(OperationSpec $spec, string $field, string|int|bool|null $value): string|int|null
    {
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        if (is_string($value) && $this->isStudyInstant($spec, $field)) {
            return Instant::format(CarbonImmutable::parse($value));
        }

        return $value;
    }

    private function isStudyInstant(OperationSpec $spec, string $field): bool
    {
        foreach ($spec->fields as $candidate) {
            if ($candidate->name === $field) {
                return $candidate->type === FieldType::StudyInstant;
            }
        }

        return false;
    }
}
