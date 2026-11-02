<?php

namespace App\Stats;

final class StatsSql
{
    public const POPULATION = "`u`.`role` = 'student' and `u`.`status` in ('active', 'disabled')";

    public const BUCKETS = <<<'SQL'
        json_table(?, '$[*]' columns (
          `bucket` int path '$[0]' error on empty error on error,
          `starts` datetime(3) path '$[1]' error on empty error on error,
          `ends` datetime(3) path '$[2]' error on empty error on error
        )) as `b`
        SQL;

    public const ATTEMPT_COUNTS = <<<'SQL'
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'passed'), 0) as `passed`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'failed'), 0) as `failed`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'compile_error'), 0) as `compile_error`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'runtime_error'), 0) as `runtime_error`,
        coalesce(sum(`a`.`counted` = 1 and `a`.`outcome` = 'timeout'), 0) as `timeout`,
        coalesce(sum(`a`.`legacy` = 0 and `a`.`outcome` = 'infra_error'), 0) as `infra_error`,
        coalesce(sum(`a`.`legacy` = 0 and `a`.`outcome` = 'canceled'), 0) as `canceled`,
        coalesce(sum(`a`.`legacy` = 1), 0) as `imported`
        SQL;

    /** @param array<string, string> $parts */
    public static function fill(string $sql, array $parts = []): string
    {
        return strtr($sql, ['{population}' => self::POPULATION, '{buckets}' => self::BUCKETS, '{attempt_counts}' => self::ATTEMPT_COUNTS, ...$parts]);
    }
}
