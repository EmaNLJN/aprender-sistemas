<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\LegacyCheckpoint;
use App\Progress\Import\Legacy\LegacyExercise;
use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\Legacy\LegacyRoute;
use App\Progress\Import\Legacy\LegacyWorkshop;
use App\Progress\Import\Legacy\ReportEntry;
use App\Progress\ProgressAreas;
use App\Runs\Record\Instant;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;

final class ImportConflicts
{
    private const NEWER_VALUE_KEPT = 'newer_value_kept';

    private const SERVER_ATTEMPT_KEPT = 'server_attempt_kept';

    private const LANGUAGES = ['rust', 'go'];

    private const NOTE_FIELDS = ['learned', 'next'];

    /** @return list<ReportEntry> */
    public static function between(LegacyProgress $progress, ProgressAreas $current): array
    {
        return [
            ...self::route($progress->route, $current),
            ...self::selected($progress->selected, $current->preferences),
            ...self::exercises($progress->exercises, $current),
            ...self::checkpoints($progress->checkpoints, $current->campaignCheckpoints),
            ...self::workshops($progress->workshops, $current),
        ];
    }

    /** @return list<ReportEntry> */
    private static function route(?LegacyRoute $route, ProgressAreas $current): array
    {
        if ($route === null) {
            return [];
        }
        $preferences = $current->preferences ?? [];
        $entries = [];
        if (self::keptNewer($preferences['routeLanguage'] ?? null, 'value', $route->language)) {
            $entries[] = self::kept('route.language');
        }
        if (self::keptNewer($preferences['focusMinutes'] ?? null, 'value', $route->minutes)) {
            $entries[] = self::kept('route.minutes');
        }

        return [
            ...$entries,
            ...self::unmarkedRouteItems($route, $current),
            ...self::quizAnswers($route, $current),
            ...self::routeNotes($route, $current),
        ];
    }

    /** @return list<ReportEntry> */
    private static function unmarkedRouteItems(LegacyRoute $route, ProgressAreas $current): array
    {
        $marks = self::indexed($current->routeMarks, ['kind', 'itemKey']);
        $entries = [];
        foreach ([['completed', 'step', $route->completed], ['milestones', 'milestone', $route->milestones], ['favorites', 'favorite', $route->favorites]] as [$list, $kind, $items]) {
            foreach ($items as $position => $item) {
                if (self::isUnmarkedWithClock($marks[self::key($kind, $item)] ?? null)) {
                    $entries[] = self::kept("route.{$list}[{$position}]");
                }
            }
        }

        return $entries;
    }

    /** @return list<ReportEntry> */
    private static function quizAnswers(LegacyRoute $route, ProgressAreas $current): array
    {
        $answers = self::indexed($current->routeQuiz, ['stepId']);
        $entries = [];
        foreach ($route->quizAnswers as $stepId => $answer) {
            if (self::keptNewer($answers[(string) $stepId] ?? null, 'answer', $answer)) {
                $entries[] = self::kept("route.quizAnswers.{$stepId}");
            }
        }

        return $entries;
    }

    /** @return list<ReportEntry> */
    private static function routeNotes(LegacyRoute $route, ProgressAreas $current): array
    {
        $notes = self::indexed($current->routeNotes, ['language', 'field']);
        $entries = [];
        foreach (self::LANGUAGES as $language) {
            foreach (self::NOTE_FIELDS as $field) {
                $body = $route->notes[$language][$field];
                if ($body !== '' && self::keptNewer($notes[self::key($language, $field)] ?? null, 'body', $body)) {
                    $entries[] = self::kept("route.notes.{$language}.{$field}");
                }
            }
        }

        return $entries;
    }

    /**
     * @param  ?array{rust: ?string, go: ?string}  $selected
     * @param  ?array<string, mixed>  $preferences
     * @return list<ReportEntry>
     */
    private static function selected(?array $selected, ?array $preferences): array
    {
        $entries = [];
        foreach (self::LANGUAGES as $language) {
            $exerciseId = $selected[$language] ?? null;
            if ($exerciseId !== null && self::keptNewer(Arr::get($preferences ?? [], "labSelected.{$language}"), 'value', $exerciseId)) {
                $entries[] = self::kept("lab.selected.{$language}");
            }
        }

        return $entries;
    }

    /**
     * @param  list<LegacyExercise>  $exercises
     * @return list<ReportEntry>
     */
    private static function exercises(array $exercises, ProgressAreas $current): array
    {
        $rows = self::indexed($current->exercises, ['exerciseId']);
        $drafts = self::indexed($current->drafts, ['exerciseId']);
        $entries = [];
        foreach ($exercises as $exercise) {
            $path = "lab.records.{$exercise->exerciseId}";
            $row = $rows[$exercise->exerciseId] ?? [];
            $draft = $drafts[$exercise->exerciseId] ?? null;
            if ($exercise->prediction !== null && self::keptNewer($row['prediction'] ?? null, 'answer', $exercise->prediction)) {
                $entries[] = self::kept("{$path}.prediction");
            }
            if ($exercise->reflection !== null && self::keptNewer($row['reflection'] ?? null, 'text', $exercise->reflection)) {
                $entries[] = self::kept("{$path}.reflection");
            }
            if ($exercise->customTest !== null && self::keptNewer($row['customTest'] ?? null, 'text', $exercise->customTest)) {
                $entries[] = self::kept("{$path}.customTest");
            }
            if (self::reviewKeptNewer($exercise, $row['review'] ?? null)) {
                $entries[] = self::kept("{$path}.review");
            }
            if ($exercise->draft !== null && self::keptNewer($draft, 'code', $exercise->draft)) {
                $entries[] = self::kept("{$path}.draft");
            }
            if ($exercise->result !== null && self::isServerAttempt($row['lastAttempt'] ?? null)) {
                $entries[] = new ReportEntry("{$path}.result", self::SERVER_ATTEMPT_KEPT);
            }
        }

        return $entries;
    }

    private static function reviewKeptNewer(LegacyExercise $exercise, mixed $review): bool
    {
        $hasGroup = $exercise->confidence !== null || $exercise->reviewAt !== null || $exercise->reviewedAt !== null;
        if (! $hasGroup || ! is_array($review) || ! is_string($review['at'] ?? null)) {
            return false;
        }

        return ($review['confidence'] ?? null) !== $exercise->confidence
            || ($review['reviewedAt'] ?? null) !== self::iso($exercise->reviewedAt)
            || ($review['reviewDueAt'] ?? null) !== self::iso($exercise->reviewAt);
    }

    private static function isServerAttempt(mixed $lastAttempt): bool
    {
        return is_array($lastAttempt) && ($lastAttempt['legacy'] ?? null) === false;
    }

    /**
     * @param  list<LegacyCheckpoint>  $checkpoints
     * @param  list<array<string, mixed>>  $rows
     * @return list<ReportEntry>
     */
    private static function checkpoints(array $checkpoints, array $rows): array
    {
        $byWorld = self::indexed($rows, ['worldId']);
        $entries = [];
        foreach ($checkpoints as $checkpoint) {
            $lastAnswer = $byWorld[$checkpoint->worldId]['lastAnswer'] ?? null;
            if ($checkpoint->lastAnswer !== null && self::keptNewer($lastAnswer, 'value', $checkpoint->lastAnswer)) {
                $entries[] = self::kept("campaign.checkpoints.{$checkpoint->worldId}.lastAnswer");
            }
        }

        return $entries;
    }

    /**
     * @param  list<LegacyWorkshop>  $workshops
     * @return list<ReportEntry>
     */
    private static function workshops(array $workshops, ProgressAreas $current): array
    {
        $progress = self::indexed($current->workshopProgress, ['workshopId', 'language']);
        $steps = self::indexed($current->workshopSteps, ['workshopId', 'language', 'stepKey']);
        $entries = [];
        foreach ($workshops as $workshop) {
            $path = "systems.records.{$workshop->language}:{$workshop->workshopId}";
            $row = $progress[self::key($workshop->workshopId, $workshop->language)] ?? [];
            if ($workshop->answer !== null && self::keptNewer($row['answer'] ?? null, 'value', $workshop->answer)) {
                $entries[] = self::kept("{$path}.answer");
            }
            if ($workshop->note !== '' && self::keptNewer($row['note'] ?? null, 'text', $workshop->note)) {
                $entries[] = self::kept("{$path}.note");
            }
            foreach ($workshop->steps as $position => $stepKey) {
                if (self::isUnmarkedWithClock($steps[self::key($workshop->workshopId, $workshop->language, $stepKey)] ?? null)) {
                    $entries[] = self::kept("{$path}.steps[{$position}]");
                }
            }
        }

        return $entries;
    }

    private static function keptNewer(mixed $field, string $valueKey, mixed $incoming): bool
    {
        return is_array($field) && is_string($field['at'] ?? null) && ($field[$valueKey] ?? null) !== $incoming;
    }

    private static function isUnmarkedWithClock(mixed $mark): bool
    {
        return is_array($mark) && ($mark['marked'] ?? null) === false && is_string($mark['at'] ?? null);
    }

    private static function kept(string $path): ReportEntry
    {
        return new ReportEntry($path, self::NEWER_VALUE_KEPT);
    }

    private static function iso(?CarbonImmutable $at): ?string
    {
        return $at === null ? null : Instant::iso($at);
    }

    private static function key(string ...$parts): string
    {
        return implode("\0", $parts);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  list<string>  $fields
     * @return array<string, array<string, mixed>>
     */
    private static function indexed(array $rows, array $fields): array
    {
        $indexed = [];
        foreach ($rows as $row) {
            $parts = [];
            foreach ($fields as $field) {
                $part = $row[$field] ?? null;
                if (! is_string($part)) {
                    continue 2;
                }
                $parts[] = $part;
            }
            $indexed[self::key(...$parts)] = $row;
        }

        return $indexed;
    }
}
