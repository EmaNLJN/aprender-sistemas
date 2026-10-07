<?php

namespace App\Progress\Merge;

use App\Progress\Operations\Rule;

final readonly class GroupSql
{
    private string $stored;

    public function __construct(string $table, private FieldWrite $write)
    {
        $this->stored = "`{$table}`";
    }

    public function changes(): string
    {
        return match ($this->write->kind->rule) {
            Rule::Lww, Rule::LwwGroup, Rule::Tombstone => $this->lwwChanges(),
            Rule::FlagOr => $this->flagOrChanges(),
            Rule::Max => $this->maxWins(),
            Rule::DatedFlag => $this->datedFlagChanges(),
            Rule::Observed => $this->earlierDate(),
        };
    }

    /** @return list<string> */
    public function assignments(): array
    {
        $kind = $this->write->kind;
        $clock = $kind->clockColumn;

        return match ($kind->rule) {
            Rule::Lww, Rule::LwwGroup, Rule::Tombstone => $this->ifWins($this->lwwWins()),
            Rule::FlagOr => ["`{$kind->columns[0]}` = ({$this->stored}.`{$kind->columns[0]}` OR `n`.`{$kind->columns[0]}`)"],
            Rule::Max => $this->ifWins($this->maxWins()),
            Rule::DatedFlag => [$this->earliestDate($clock, $this->flagIsSet()), $this->flagAssignment()],
            Rule::Observed => [$this->earliestDate($clock, null)],
        };
    }

    private function lwwWins(): string
    {
        $clock = $this->write->kind->clockColumn;

        return "{$this->stored}.`{$clock}` IS NULL OR (`n`.`{$clock}` IS NOT NULL AND `n`.`{$clock}` >= {$this->stored}.`{$clock}`)";
    }

    private function lwwChanges(): string
    {
        $kind = $this->write->kind;
        $clock = (string) $kind->clockColumn;
        $same = [];
        foreach ($kind->columns as $column) {
            $same[] = in_array($column, $kind->binaryColumns, true)
                ? "CAST({$this->stored}.`{$column}` AS BINARY) <=> CAST(`n`.`{$column}` AS BINARY)"
                : "{$this->stored}.`{$column}` <=> `n`.`{$column}`";
        }
        $same[] = "{$this->stored}.`{$clock}` <=> `n`.`{$clock}`";

        return '('.$this->lwwWins().') AND NOT ('.implode(' AND ', $same).')';
    }

    private function flagOrChanges(): string
    {
        $column = $this->write->kind->columns[0];

        return "{$this->stored}.`{$column}` = 0 AND `n`.`{$column}` = 1";
    }

    private function maxWins(): string
    {
        $column = $this->write->kind->columns[0];

        return "{$this->stored}.`{$column}` IS NULL OR `n`.`{$column}` > {$this->stored}.`{$column}`";
    }

    private function datedFlagChanges(): string
    {
        $flag = $this->write->kind->columns[0];

        return "`n`.`{$flag}` = 1 AND ({$this->stored}.`{$flag}` = 0 OR ".$this->earlierDate().')';
    }

    private function earlierDate(): string
    {
        $date = (string) $this->write->kind->clockColumn;

        return "({$this->stored}.`{$date}` IS NULL AND `n`.`{$date}` IS NOT NULL) OR (`n`.`{$date}` IS NOT NULL AND `n`.`{$date}` < {$this->stored}.`{$date}`)";
    }

    /** @return list<string> */
    private function ifWins(string $wins): array
    {
        $kind = $this->write->kind;
        $assignments = [];
        foreach ([...$kind->columns, ...($kind->clockColumn === null ? [] : [$kind->clockColumn])] as $column) {
            $assignments[] = "`{$column}` = IF({$wins}, `n`.`{$column}`, {$this->stored}.`{$column}`)";
        }

        return $assignments;
    }

    private function flagIsSet(): string
    {
        return "`n`.`{$this->write->kind->columns[0]}` = 1";
    }

    private function earliestDate(?string $date, ?string $condition): string
    {
        $earliest = "LEAST(COALESCE({$this->stored}.`{$date}`, `n`.`{$date}`), COALESCE(`n`.`{$date}`, {$this->stored}.`{$date}`))";
        $value = $condition === null ? $earliest : "IF({$condition}, {$earliest}, {$this->stored}.`{$date}`)";

        return "`{$date}` = {$value}";
    }

    private function flagAssignment(): string
    {
        $flag = $this->write->kind->columns[0];

        return "`{$flag}` = IF({$this->flagIsSet()}, 1, {$this->stored}.`{$flag}`)";
    }
}
