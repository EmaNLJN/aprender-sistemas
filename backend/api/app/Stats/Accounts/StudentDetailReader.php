<?php

namespace App\Stats\Accounts;

use App\Content\Record\RowFields;
use App\Runs\Admission\QuotaPolicy;
use App\Stats\AttemptCounts;
use App\Stats\Moment;
use App\Stats\Period;
use App\Stats\StatsRows;
use App\Stats\StatsSql;
use Carbon\CarbonImmutable;

final class StudentDetailReader
{
    private const HEAD_SQL = 'select `h`.`epoch`, `h`.`reset_at`, `h`.`last_activity_at` from `progress_heads` as `h` where `h`.`user_id` = ?';

    private const IMPORTS_SQL = 'select `i`.`imported_at`, `i`.`source`, `i`.`epoch` from `progress_imports` as `i` where `i`.`user_id` = ? order by `i`.`imported_at`, `i`.`id`';

    private const SOLVED_SQL = <<<'SQL'
        select `e`.`catalog`, `e`.`language`,
          coalesce(sum(`p`.`server_solved_at` is not null), 0) as `server`,
          coalesce(sum(`p`.`solved_at` is not null and `p`.`server_solved_at` is null), 0) as `imported`
        from `exercise_progress` as `p`
        join `exercises` as `e` on `e`.`id` = `p`.`exercise_id`
        where `p`.`user_id` = ?
        group by `e`.`catalog`, `e`.`language`
        order by `e`.`catalog`, `e`.`language`
        SQL;

    private const ATTEMPTS_TOTAL_SQL = 'select {attempt_counts} from `attempts` as `a` where `a`.`user_id` = ?';

    private const ATTEMPTS_PERIOD_SQL = 'select {attempt_counts} from `attempts` as `a` where `a`.`user_id` = ? and `a`.`attempted_at` >= ? and `a`.`attempted_at` < ?';

    private const ACTIVITY_SQL = <<<'SQL'
        select `b`.`bucket`, count(`a`.`id`) as `attempts`
        from {buckets}
        left join `attempts` as `a` on `a`.`user_id` = ? and `a`.`counted` = 1
          and `a`.`attempted_at` >= `b`.`starts` and `a`.`attempted_at` < `b`.`ends`
        group by `b`.`bucket`
        order by `b`.`bucket`
        SQL;

    private const GRID_SQL = <<<'SQL'
        select `p`.`exercise_id`, `p`.`solved_at`, `p`.`server_solved_at`, `p`.`attempt_count`, `p`.`last_attempt_at`,
          `p`.`assisted`, `p`.`solution_seen`, `p`.`hints_revealed`, (`p`.`prediction_answer` is not null) as `prediction_answered`,
          `p`.`prediction_correct`, `p`.`confidence`, `p`.`review_due_at`, `la`.`outcome` as `last_outcome`
        from `exercise_progress` as `p`
        left join `attempts` as `la` on `la`.`id` = `p`.`last_attempt_id` and `la`.`user_id` = `p`.`user_id`
        where `p`.`user_id` = ?
        order by `p`.`exercise_id`
        SQL;

    private const CHECKPOINTS_SQL = <<<'SQL'
        select `k`.`world_id`, (`k`.`last_answer` is not null or `k`.`passed` = 1) as `answered`, `k`.`passed`, `k`.`passed_at`
        from `campaign_checkpoints` as `k`
        where `k`.`user_id` = ?
        order by `k`.`world_id`
        SQL;

    private const SEALS_SQL = 'select count(*) as `sealed` from `campaign_seals` as `s` where `s`.`user_id` = ?';

    private const WORKSHOPS_SQL = <<<'SQL'
        select `w`.`workshop_id`, `w`.`language`, `w`.`code_sealed`, (`w`.`answer` is not null) as `prediction_answered`, `w`.`prediction_correct`,
          (select count(*) from `workshop_step_marks` as `m`
            where `m`.`user_id` = `w`.`user_id` and `m`.`workshop_id` = `w`.`workshop_id` and `m`.`language` = `w`.`language` and `m`.`marked` = 1) as `steps_marked`,
          (select count(*) from `workshop_observations` as `o`
            where `o`.`user_id` = `w`.`user_id` and `o`.`workshop_id` = `w`.`workshop_id` and `o`.`language` = `w`.`language` and `o`.`observed_at` is not null) as `objectives_observed`
        from `workshop_progress` as `w`
        where `w`.`user_id` = ?
        order by `w`.`workshop_id`, `w`.`language`
        SQL;

    private const ROUTE_SQL = <<<'SQL'
        select
          coalesce(sum(`r`.`kind` = 'step' and `r`.`marked` = 1), 0) as `steps`,
          coalesce(sum(`r`.`kind` = 'milestone' and `r`.`marked` = 1), 0) as `milestones`,
          coalesce(sum(`r`.`kind` = 'favorite' and `r`.`marked` = 1), 0) as `favorites`,
          (select count(*) from `route_quiz_answers` as `q` where `q`.`user_id` = ?) as `quiz_answered`
        from `route_marks` as `r`
        where `r`.`user_id` = ?
        SQL;

    public function __construct(private StatsRows $rows, private QuotaPolicy $quotas) {}

    /**
     * @param  array<string, mixed>  $account
     * @return array<string, mixed>
     */
    public function read(array $account, int $userId, Period $period, CarbonImmutable $now): array
    {
        $activity = [];
        $buckets = $period->buckets();
        foreach ($this->rows->select(StatsSql::fill(self::ACTIVITY_SQL), [$period->bucketsJson(), $userId], 'attempts') as $index => $row) {
            $activity[] = ['start' => $buckets[$index]['start'], 'attempts' => $row->int('attempts')];
        }

        return [
            'account' => $account,
            'progress' => $this->progress($userId),
            'imports' => $this->imports($userId),
            'solvedByCatalog' => $this->solved($userId),
            'attempts' => [
                'inPeriod' => AttemptCounts::from($this->rows->one(StatsSql::fill(self::ATTEMPTS_PERIOD_SQL), [$userId, $period->startsUtc(), $period->endsUtc()], 'attempts')),
                'total' => AttemptCounts::from($this->rows->one(StatsSql::fill(self::ATTEMPTS_TOTAL_SQL), [$userId], 'attempts')),
            ],
            'activity' => $activity,
            'quota' => $this->quota($userId, $now),
            'exercises' => $this->grid($userId),
            'campaign' => $this->campaign($userId),
            'workshops' => $this->workshops($userId),
            'route' => $this->route($userId),
        ];
    }

    /** @return array{epoch: int, resetAt: ?string, lastActivityAt: ?string} */
    private function progress(int $userId): array
    {
        $head = $this->rows->select(self::HEAD_SQL, [$userId], 'progress_heads')[0] ?? null;

        return [
            'epoch' => $head?->int('epoch') ?? 1,
            'resetAt' => Moment::iso($head?->nullableString('reset_at')),
            'lastActivityAt' => Moment::iso($head?->nullableString('last_activity_at')),
        ];
    }

    /** @return list<array{importedAt: ?string, source: string, epoch: int}> */
    private function imports(int $userId): array
    {
        $imports = [];
        foreach ($this->rows->select(self::IMPORTS_SQL, [$userId], 'progress_imports') as $row) {
            $imports[] = ['importedAt' => Moment::iso($row->string('imported_at')), 'source' => $row->string('source'), 'epoch' => $row->int('epoch')];
        }

        return $imports;
    }

    /** @return list<array{catalog: string, language: string, server: int, imported: int}> */
    private function solved(int $userId): array
    {
        $solved = [];
        foreach ($this->rows->select(self::SOLVED_SQL, [$userId], 'exercise_progress') as $row) {
            $solved[] = ['catalog' => $row->string('catalog'), 'language' => $row->string('language'), 'server' => $row->int('server'), 'imported' => $row->int('imported')];
        }

        return $solved;
    }

    /** @return array<string, mixed> */
    private function quota(int $userId, CarbonImmutable $now): array
    {
        $usage = $this->quotas->usage($userId, $now);

        return [
            'active' => $usage->active,
            'lastMinute' => $usage->lastMinute,
            'lastDay' => $usage->lastDay,
            'sandboxMs' => $usage->sandboxMs,
            'limits' => [
                'active' => config()->integer('runs.quota.active'),
                'perMinute' => config()->integer('runs.quota.per_minute'),
                'perDay' => config()->integer('runs.quota.per_day'),
                'sandboxMinutes' => config()->integer('runs.quota.sandbox_minutes_per_day'),
            ],
        ];
    }

    /** @return list<array<string, mixed>> */
    private function grid(int $userId): array
    {
        $grid = [];
        foreach ($this->rows->select(self::GRID_SQL, [$userId], 'exercise_progress') as $row) {
            $grid[] = [
                'exerciseId' => $row->string('exercise_id'),
                'state' => self::state($row),
                'solvedAt' => Moment::iso($row->nullableString('solved_at')),
                'serverSolvedAt' => Moment::iso($row->nullableString('server_solved_at')),
                'attemptCount' => $row->int('attempt_count'),
                'lastAttemptAt' => Moment::iso($row->nullableString('last_attempt_at')),
                'lastOutcome' => $row->nullableString('last_outcome'),
                'assisted' => $row->flag('assisted'),
                'solutionSeen' => $row->flag('solution_seen'),
                'hintsRevealed' => $row->nullableInt('hints_revealed'),
                'predictionAnswered' => $row->flag('prediction_answered'),
                'predictionCorrect' => $row->flag('prediction_correct'),
                'confidence' => $row->nullableString('confidence'),
                'reviewDueAt' => Moment::iso($row->nullableString('review_due_at')),
            ];
        }

        return $grid;
    }

    private static function state(RowFields $row): string
    {
        return match (true) {
            $row->nullableString('solved_at') !== null => 'solved',
            $row->int('attempt_count') > 0 || $row->nullableString('last_attempt_at') !== null => 'attempted',
            default => 'started',
        };
    }

    /** @return array{checkpoints: list<array{worldId: string, answered: bool, passed: bool, passedAt: ?string}>, sealedExercises: int} */
    private function campaign(int $userId): array
    {
        $checkpoints = [];
        foreach ($this->rows->select(self::CHECKPOINTS_SQL, [$userId], 'campaign_checkpoints') as $row) {
            $checkpoints[] = [
                'worldId' => $row->string('world_id'),
                'answered' => $row->flag('answered'),
                'passed' => $row->flag('passed'),
                'passedAt' => Moment::iso($row->nullableString('passed_at')),
            ];
        }

        return ['checkpoints' => $checkpoints, 'sealedExercises' => $this->rows->one(self::SEALS_SQL, [$userId], 'campaign_seals')->int('sealed')];
    }

    /** @return list<array<string, mixed>> */
    private function workshops(int $userId): array
    {
        $workshops = [];
        foreach ($this->rows->select(self::WORKSHOPS_SQL, [$userId], 'workshop_progress') as $row) {
            $workshops[] = [
                'workshopId' => $row->string('workshop_id'),
                'language' => $row->string('language'),
                'codeSealed' => $row->flag('code_sealed'),
                'predictionAnswered' => $row->flag('prediction_answered'),
                'predictionCorrect' => $row->flag('prediction_correct'),
                'stepsMarked' => $row->int('steps_marked'),
                'objectivesObserved' => $row->int('objectives_observed'),
            ];
        }

        return $workshops;
    }

    /** @return array{steps: int, milestones: int, favorites: int, quizAnswered: int} */
    private function route(int $userId): array
    {
        $row = $this->rows->one(self::ROUTE_SQL, [$userId, $userId], 'route_marks');

        return ['steps' => $row->int('steps'), 'milestones' => $row->int('milestones'), 'favorites' => $row->int('favorites'), 'quizAnswered' => $row->int('quiz_answered')];
    }
}
