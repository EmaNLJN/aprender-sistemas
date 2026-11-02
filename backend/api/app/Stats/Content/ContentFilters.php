<?php

namespace App\Stats\Content;

final readonly class ContentFilters
{
    public function __construct(public ?string $catalog, public ?string $language, public ?string $level) {}

    /** @return array{string, list<string>} */
    public function exercises(): array
    {
        return $this->where(['catalog' => '`e`.`catalog`', 'language' => '`e`.`language`', 'level' => '`e`.`level`']);
    }

    /** @return array{string, list<string>} */
    public function worlds(): array
    {
        return $this->where(['language' => '`w`.`language`', 'level' => '`w`.`level`']);
    }

    /** @return array{string, list<string>} */
    public function workshops(): array
    {
        return $this->where(['level' => '`ws`.`level`']);
    }

    /** @return array{catalog: ?string, language: ?string, level: ?string} */
    public function toMeta(): array
    {
        return ['catalog' => $this->catalog, 'language' => $this->language, 'level' => $this->level];
    }

    public function cacheKey(): string
    {
        return json_encode($this->toMeta(), JSON_THROW_ON_ERROR);
    }

    /**
     * @param  array<'catalog'|'language'|'level', string>  $columns
     * @return array{string, list<string>}
     */
    private function where(array $columns): array
    {
        $clauses = ['1 = 1'];
        $bindings = [];
        foreach ($columns as $filter => $column) {
            $value = match ($filter) {
                'catalog' => $this->catalog,
                'language' => $this->language,
                'level' => $this->level,
            };
            if ($value !== null) {
                $clauses[] = "{$column} = ?";
                $bindings[] = $value;
            }
        }

        return [implode(' and ', $clauses), $bindings];
    }
}
