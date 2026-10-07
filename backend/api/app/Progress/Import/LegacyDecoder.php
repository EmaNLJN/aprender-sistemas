<?php

namespace App\Progress\Import;

use App\Progress\Import\Legacy\ContentFacts;
use App\Progress\Import\Legacy\LegacyCheckpoint;
use App\Progress\Import\Legacy\LegacyExercise;
use App\Progress\Import\Legacy\LegacyProgress;
use App\Progress\Import\Legacy\LegacyResult;
use App\Progress\Import\Legacy\LegacyRoute;
use App\Progress\Import\Legacy\LegacySeal;
use App\Progress\Import\Legacy\LegacyWorkshop;
use App\Progress\Import\Legacy\ReportEntry;
use App\Progress\Operations\RouteMilestones;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

final class LegacyDecoder
{
    private const SECTIONS = ['route', 'lab', 'campaign', 'systems'];

    private const LANGUAGES = ['rust', 'go'];

    private const MINUTES = [15, 25, 45];

    private const CONFIDENCES = ['again', 'practice', 'confident'];

    private const MAX_SAFE_INTEGER = 9007199254740991;

    private const MAX_HINTS = 3;

    private const FIRST_INSTANT_MS = -30610224000000;

    private const LAST_INSTANT_MS = 253402300799999;

    private const ROUTE_NOTE_CHARS = 20000;

    private const DRAFT_CHARS = 30000;

    private const REFLECTION_CHARS = 10000;

    private const CUSTOM_TEST_CHARS = 3000;

    private const RESULT_CODE_CHARS = 30000;

    private const RESULT_STDOUT_CHARS = 12000;

    private const RESULT_STDERR_CHARS = 18000;

    private const WORKSHOP_NOTE_CHARS = 10000;

    private const REPLACEMENT_CHARACTER = "\u{FFFD}";

    private const NOT_AN_INTEGER = 'not_an_integer';

    private const DATE_OUT_OF_RANGE = 'date_out_of_range';

    private const OUTSIDE_OPTIONS = 'outside_options';

    private const BEYOND_ACTIVE_HINTS = 'beyond_active_hints';

    private const UNKNOWN_STEP_POSITION = 'unknown_step_position';

    private const CONTRADICTS_TRANSPORT_ERROR = 'contradicts_transport_error';

    private const REPLACEMENT_REASON = 'replacement_character';

    private ContentFacts $content;

    /** @var list<ReportEntry> */
    private array $omitted = [];

    /** @var list<ReportEntry> */
    private array $replaced = [];

    /**
     * @param  array<array-key, mixed>  $normalized
     *
     * @throws ValidationException
     */
    public function decode(array $normalized, ContentFacts $content): LegacyProgress
    {
        $this->content = $content;
        $this->omitted = [];
        $this->replaced = [];

        $sections = $this->object($normalized, '', [], self::SECTIONS);
        if ($sections === []) {
            $this->fail('', 'no_sections');
        }

        $route = array_key_exists('route', $sections) ? $this->route($sections['route']) : null;
        $lab = array_key_exists('lab', $sections) ? $this->lab($sections['lab']) : null;
        $campaign = array_key_exists('campaign', $sections) ? $this->campaign($sections['campaign']) : null;
        $workshops = array_key_exists('systems', $sections) ? $this->systems($sections['systems']) : [];

        return new LegacyProgress(
            route: $route,
            exercises: $lab['exercises'] ?? [],
            selected: $lab['selected'] ?? null,
            seals: $campaign['seals'] ?? [],
            checkpoints: $campaign['checkpoints'] ?? [],
            workshops: $workshops,
            omitted: $this->omitted,
            replaced: $this->replaced,
        );
    }

    private function route(mixed $value): LegacyRoute
    {
        $route = $this->section($value, 'route', ['language', 'completed', 'milestones', 'favorites', 'quizAnswers', 'notes', 'minutes']);

        return new LegacyRoute(
            language: $this->language($route['language'], 'route.language'),
            minutes: $this->minutes($route['minutes']),
            completed: $this->knownIds($route['completed'], 'route.completed', $this->content->quizOptions),
            milestones: $this->knownIds($route['milestones'], 'route.milestones', array_flip(RouteMilestones::KEYS)),
            favorites: $this->knownIds($route['favorites'], 'route.favorites', array_flip($this->content->resources)),
            quizAnswers: $this->quizAnswers($route['quizAnswers']),
            notes: $this->routeNotes($route['notes']),
        );
    }

    private function language(mixed $value, string $path): string
    {
        if (! is_string($value)) {
            $this->fail($path, 'wrong_type');
        }
        if (! in_array($value, self::LANGUAGES, true)) {
            $this->fail($path, 'out_of_domain');
        }

        return $value;
    }

    private function minutes(mixed $value): int
    {
        $minutes = $this->integer($value, 'route.minutes', 0, self::MAX_SAFE_INTEGER);
        if (! in_array($minutes, self::MINUTES, true)) {
            $this->fail('route.minutes', 'out_of_domain');
        }

        return $minutes;
    }

    /** @return array<string, int> */
    private function quizAnswers(mixed $value): array
    {
        $answers = [];
        foreach ($this->map($value, 'route.quizAnswers') as $step => $answer) {
            $path = "route.quizAnswers.{$step}";
            if (! array_key_exists($step, $this->content->quizOptions)) {
                $this->fail($path, 'unknown_id');
            }
            $choice = $this->integer($answer, $path, 0, self::MAX_SAFE_INTEGER);
            if ($choice < $this->content->quizOptions[$step]) {
                $answers[$step] = $choice;
            } else {
                $this->omit($path, self::OUTSIDE_OPTIONS);
            }
        }

        return $answers;
    }

    /** @return array{rust: array{learned: string, next: string}, go: array{learned: string, next: string}} */
    private function routeNotes(mixed $value): array
    {
        $notes = $this->object($value, 'route.notes', ['rust', 'go'], []);

        return [
            'rust' => $this->languageNotes($notes['rust'], 'route.notes.rust'),
            'go' => $this->languageNotes($notes['go'], 'route.notes.go'),
        ];
    }

    /** @return array{learned: string, next: string} */
    private function languageNotes(mixed $value, string $path): array
    {
        $notes = $this->object($value, $path, ['learned', 'next'], []);

        return [
            'learned' => $this->text($notes['learned'], "{$path}.learned", self::ROUTE_NOTE_CHARS),
            'next' => $this->text($notes['next'], "{$path}.next", self::ROUTE_NOTE_CHARS),
        ];
    }

    /** @return array{exercises: list<LegacyExercise>, selected: array{rust: ?string, go: ?string}} */
    private function lab(mixed $value): array
    {
        $lab = $this->section($value, 'lab', ['records', 'selected']);

        $exercises = [];
        foreach ($this->map($lab['records'], 'lab.records') as $id => $record) {
            $exercises[] = $this->exercise($id, $record);
        }

        return ['exercises' => $exercises, 'selected' => $this->selected($lab['selected'])];
    }

    /** @return array{rust: ?string, go: ?string} */
    private function selected(mixed $value): array
    {
        $selected = $this->object($value, 'lab.selected', ['rust', 'go'], []);

        return [
            'rust' => $this->selectedExercise($selected['rust'], 'rust'),
            'go' => $this->selectedExercise($selected['go'], 'go'),
        ];
    }

    private function selectedExercise(mixed $value, string $language): ?string
    {
        $path = "lab.selected.{$language}";
        if ($value === null) {
            return null;
        }
        if (! is_string($value)) {
            $this->fail($path, 'wrong_type');
        }
        if (! array_key_exists($value, $this->content->exercises)) {
            $this->fail($path, 'unknown_id');
        }
        if ($this->content->exercises[$value]['language'] !== $language) {
            $this->fail($path, 'wrong_language');
        }

        return $value;
    }

    private function exercise(string $id, mixed $value): LegacyExercise
    {
        $path = "lab.records.{$id}";
        if (! array_key_exists($id, $this->content->exercises)) {
            $this->fail($path, 'unknown_id');
        }
        $facts = $this->content->exercises[$id];
        $record = $this->object(
            $value,
            $path,
            ['predictionCorrect', 'assisted', 'solutionSeen'],
            ['prediction', 'hints', 'draft', 'reflection', 'customTest', 'attempts', 'solvedAt', 'reviewAt', 'reviewedAt', 'confidence', 'result'],
        );

        return new LegacyExercise(
            exerciseId: $id,
            predictionCorrect: $this->flag($record['predictionCorrect'], "{$path}.predictionCorrect"),
            assisted: $this->flag($record['assisted'], "{$path}.assisted"),
            solutionSeen: $this->flag($record['solutionSeen'], "{$path}.solutionSeen"),
            prediction: $this->prediction($record, $path, $facts['predictionOptions']),
            hints: $this->hints($record, $path, $facts['activeHints']),
            draft: $this->optionalText($record, 'draft', $path, self::DRAFT_CHARS),
            reflection: $this->optionalText($record, 'reflection', $path, self::REFLECTION_CHARS),
            customTest: $this->optionalText($record, 'customTest', $path, self::CUSTOM_TEST_CHARS),
            attempts: $this->attempts($record, $path),
            solvedAt: $this->optionalInstant($record, 'solvedAt', $path, 1),
            reviewAt: $this->optionalInstant($record, 'reviewAt', $path, 0),
            reviewedAt: $this->optionalInstant($record, 'reviewedAt', $path, 0),
            confidence: $this->confidence($record, $path),
            result: array_key_exists('result', $record) ? $this->result($record['result'], "{$path}.result", $facts['testKeys']) : null,
        );
    }

    /** @param array<string, mixed> $record */
    private function prediction(array $record, string $path, int $options): ?int
    {
        if (! array_key_exists('prediction', $record)) {
            return null;
        }
        $prediction = $this->integer($record['prediction'], "{$path}.prediction", 0, self::MAX_SAFE_INTEGER);
        if ($prediction >= $options) {
            $this->omit("{$path}.prediction", self::OUTSIDE_OPTIONS);

            return null;
        }

        return $prediction;
    }

    /** @param array<string, mixed> $record */
    private function hints(array $record, string $path, int $activeHints): ?int
    {
        if (! array_key_exists('hints', $record)) {
            return null;
        }
        $hints = $this->number($record['hints'], "{$path}.hints", 0, self::MAX_HINTS);
        if (! $this->isWhole($hints)) {
            $this->omit("{$path}.hints", self::NOT_AN_INTEGER);

            return null;
        }
        if ($hints > $activeHints) {
            $this->omit("{$path}.hints", self::BEYOND_ACTIVE_HINTS);

            return null;
        }

        return (int) $hints;
    }

    /** @param array<string, mixed> $record */
    private function attempts(array $record, string $path): ?int
    {
        if (! array_key_exists('attempts', $record)) {
            return null;
        }
        $attempts = $this->number($record['attempts'], "{$path}.attempts", 0, self::MAX_SAFE_INTEGER);
        if (! $this->isWhole($attempts)) {
            $this->omit("{$path}.attempts", self::NOT_AN_INTEGER);

            return null;
        }

        return (int) $attempts;
    }

    /** @param array<string, mixed> $record */
    private function optionalInstant(array $record, string $field, string $path, int $minimum): ?CarbonImmutable
    {
        if (! array_key_exists($field, $record)) {
            return null;
        }
        $milliseconds = $this->number($record[$field], "{$path}.{$field}", $minimum, self::MAX_SAFE_INTEGER);
        $instant = $this->instant($milliseconds);
        if ($instant === null) {
            $this->omit("{$path}.{$field}", self::DATE_OUT_OF_RANGE);
        }

        return $instant;
    }

    /** @param array<string, mixed> $record */
    private function confidence(array $record, string $path): ?string
    {
        if (! array_key_exists('confidence', $record)) {
            return null;
        }
        $confidence = $record['confidence'];
        if (! is_string($confidence)) {
            $this->fail("{$path}.confidence", 'wrong_type');
        }
        if (! in_array($confidence, self::CONFIDENCES, true)) {
            $this->fail("{$path}.confidence", 'out_of_domain');
        }

        return $confidence;
    }

    /** @param list<string> $testKeys */
    private function result(mixed $value, string $path, array $testKeys): ?LegacyResult
    {
        $result = $this->object(
            $value,
            $path,
            ['code', 'success', 'transportError', 'stdout', 'stderr', 'tests', 'time', 'customTest', 'customPassed'],
            ['attemptId'],
        );
        $success = $this->flag($result['success'], "{$path}.success");
        $transportError = $this->flag($result['transportError'], "{$path}.transportError");
        $code = $this->text($result['code'], "{$path}.code", self::RESULT_CODE_CHARS);
        $stdout = $this->text($result['stdout'], "{$path}.stdout", self::RESULT_STDOUT_CHARS);
        $stderr = $this->text($result['stderr'], "{$path}.stderr", self::RESULT_STDERR_CHARS);
        $tests = $this->resultTests($result['tests'], "{$path}.tests", $testKeys);
        $customTest = $this->text($result['customTest'], "{$path}.customTest", self::CUSTOM_TEST_CHARS);
        $customPassed = $this->flag($result['customPassed'], "{$path}.customPassed");
        $attemptId = array_key_exists('attemptId', $result) ? $this->integer($result['attemptId'], "{$path}.attemptId", 1, self::MAX_SAFE_INTEGER) : null;

        $time = $this->instant($this->number($result['time'], "{$path}.time", PHP_INT_MIN, PHP_INT_MAX));
        if ($time === null) {
            $this->omit($path, self::DATE_OUT_OF_RANGE);

            return null;
        }
        if ($success && $transportError) {
            $this->omit("{$path}.success", self::CONTRADICTS_TRANSPORT_ERROR);
            $success = false;
        }

        return new LegacyResult($code, $success, $transportError, $stdout, $stderr, $tests, $time, $customTest, $customPassed, $attemptId);
    }

    /**
     * @param  list<string>  $testKeys
     * @return list<array{testKey: string, passed: bool}>
     */
    private function resultTests(mixed $value, string $path, array $testKeys): array
    {
        $tests = [];
        $seen = [];
        foreach ($this->list($value, $path) as $index => $item) {
            $itemPath = "{$path}[{$index}]";
            $test = $this->object($item, $itemPath, ['id', 'passed'], []);
            $key = $test['id'];
            if (! is_string($key)) {
                $this->fail("{$itemPath}.id", 'wrong_type');
            }
            if (! in_array($key, $testKeys, true)) {
                $this->fail("{$itemPath}.id", 'unknown_id');
            }
            if (isset($seen[$key])) {
                $this->fail("{$itemPath}.id", 'duplicated');
            }
            $seen[$key] = true;
            $tests[] = ['testKey' => $key, 'passed' => $this->flag($test['passed'], "{$itemPath}.passed")];
        }

        return $tests;
    }

    /** @return array{seals: list<LegacySeal>, checkpoints: list<LegacyCheckpoint>} */
    private function campaign(mixed $value): array
    {
        $campaign = $this->section($value, 'campaign', ['seals', 'checkpoints']);

        $seals = [];
        foreach ($this->map($campaign['seals'], 'campaign.seals') as $id => $seal) {
            $seals[] = $this->seal($id, $seal);
        }
        $checkpoints = [];
        foreach ($this->map($campaign['checkpoints'], 'campaign.checkpoints') as $id => $checkpoint) {
            $checkpoints[] = $this->checkpoint($id, $checkpoint);
        }

        return ['seals' => $seals, 'checkpoints' => $checkpoints];
    }

    private function seal(string $id, mixed $value): LegacySeal
    {
        $path = "campaign.seals.{$id}";
        if (! array_key_exists($id, $this->content->exercises)) {
            $this->fail($path, 'unknown_id');
        }
        $seal = $this->object($value, $path, ['code', 'prediction', 'assisted'], []);

        return new LegacySeal(
            $id,
            $this->flag($seal['code'], "{$path}.code"),
            $this->flag($seal['prediction'], "{$path}.prediction"),
            $this->flag($seal['assisted'], "{$path}.assisted"),
        );
    }

    private function checkpoint(string $id, mixed $value): LegacyCheckpoint
    {
        $path = "campaign.checkpoints.{$id}";
        if (! array_key_exists($id, $this->content->checkpointOptions)) {
            $this->fail($path, 'unknown_id');
        }
        $checkpoint = $this->object($value, $path, ['passed', 'lastAnswer'], []);

        return new LegacyCheckpoint(
            $id,
            $this->flag($checkpoint['passed'], "{$path}.passed"),
            $this->optionalAnswer($checkpoint['lastAnswer'], "{$path}.lastAnswer", $this->content->checkpointOptions[$id]),
        );
    }

    /** @return list<LegacyWorkshop> */
    private function systems(mixed $value): array
    {
        $systems = $this->section($value, 'systems', ['records']);

        $workshops = [];
        foreach ($this->map($systems['records'], 'systems.records') as $name => $record) {
            $workshops[] = $this->workshop($name, $record);
        }

        return $workshops;
    }

    private function workshop(string $name, mixed $value): LegacyWorkshop
    {
        $path = "systems.records.{$name}";
        [$language, $workshopId] = [...explode(':', $name, 2), ''];
        if (! in_array($language, self::LANGUAGES, true) || ! array_key_exists($workshopId, $this->content->workshops)) {
            $this->fail($path, 'unknown_id');
        }
        $facts = $this->content->workshops[$workshopId];
        $record = $this->object($value, $path, ['observed', 'code', 'predicted', 'answer', 'steps', 'note'], []);

        return new LegacyWorkshop(
            workshopId: $workshopId,
            language: $language,
            codeSealed: $this->flag($record['code'], "{$path}.code"),
            predicted: $this->flag($record['predicted'], "{$path}.predicted"),
            answer: $this->optionalAnswer($record['answer'], "{$path}.answer", $facts['predictionOptions']),
            observed: $this->knownIds($record['observed'], "{$path}.observed", array_flip($facts['objectives'])),
            steps: $this->stepKeys($record['steps'], "{$path}.steps", $facts['stepsByV1Position']),
            note: $this->text($record['note'], "{$path}.note", self::WORKSHOP_NOTE_CHARS),
        );
    }

    /**
     * @param  array<int, string>  $stepsByV1Position
     * @return list<string>
     */
    private function stepKeys(mixed $value, string $path, array $stepsByV1Position): array
    {
        $keys = [];
        $seen = [];
        foreach ($this->list($value, $path) as $index => $item) {
            $itemPath = "{$path}[{$index}]";
            $position = $this->integer($item, $itemPath, 0, self::MAX_SAFE_INTEGER);
            if (isset($seen[$position])) {
                $this->fail($itemPath, 'duplicated');
            }
            $seen[$position] = true;
            if (array_key_exists($position, $stepsByV1Position)) {
                $keys[] = $stepsByV1Position[$position];
            } else {
                $this->omit($itemPath, self::UNKNOWN_STEP_POSITION);
            }
        }

        return $keys;
    }

    private function optionalAnswer(mixed $value, string $path, int $options): ?int
    {
        if ($value === null) {
            return null;
        }
        $answer = $this->integer($value, $path, 0, self::MAX_SAFE_INTEGER);
        if ($answer >= $options) {
            $this->omit($path, self::OUTSIDE_OPTIONS);

            return null;
        }

        return $answer;
    }

    /**
     * @param  list<string>  $required
     * @return array<string, mixed>
     */
    private function section(mixed $value, string $path, array $required): array
    {
        $section = $this->object($value, $path, $required, ['version']);
        if (($section['version'] ?? null) !== 1) {
            $this->fail("{$path}.version", 'unsupported_version');
        }

        return $section;
    }

    /**
     * @param  list<string>  $required
     * @param  list<string>  $optional
     * @return array<string, mixed>
     */
    private function object(mixed $value, string $path, array $required, array $optional): array
    {
        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            $this->fail($path, 'wrong_type');
        }
        $allowed = [...$required, ...$optional];
        $fields = [];
        foreach ($value as $key => $field) {
            $name = (string) $key;
            if (! in_array($name, $allowed, true)) {
                $this->fail($this->child($path, $name), 'unknown_field');
            }
            $fields[$name] = $field;
        }
        foreach ($required as $name) {
            if (! array_key_exists($name, $fields)) {
                $this->fail($this->child($path, $name), 'required');
            }
        }

        return $fields;
    }

    /** @return array<string, mixed> */
    private function map(mixed $value, string $path): array
    {
        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            $this->fail($path, 'wrong_type');
        }
        $entries = [];
        foreach ($value as $key => $entry) {
            $entries[(string) $key] = $entry;
        }

        return $entries;
    }

    /** @return list<mixed> */
    private function list(mixed $value, string $path): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            $this->fail($path, 'wrong_type');
        }

        return $value;
    }

    /**
     * @param  array<string, mixed>  $known
     * @return list<string>
     */
    private function knownIds(mixed $value, string $path, array $known): array
    {
        $ids = [];
        $seen = [];
        foreach ($this->list($value, $path) as $index => $id) {
            $itemPath = "{$path}[{$index}]";
            if (! is_string($id)) {
                $this->fail($itemPath, 'wrong_type');
            }
            if (! array_key_exists($id, $known)) {
                $this->fail($itemPath, 'unknown_id');
            }
            if (isset($seen[$id])) {
                $this->fail($itemPath, 'duplicated');
            }
            $seen[$id] = true;
            $ids[] = $id;
        }

        return $ids;
    }

    private function flag(mixed $value, string $path): bool
    {
        if (! is_bool($value)) {
            $this->fail($path, 'wrong_type');
        }

        return $value;
    }

    private function text(mixed $value, string $path, int $maxChars): string
    {
        if (! is_string($value)) {
            $this->fail($path, 'wrong_type');
        }
        if (mb_strlen($value) > $maxChars) {
            $this->fail($path, 'too_long');
        }
        if (str_contains($value, self::REPLACEMENT_CHARACTER)) {
            $this->replaced[] = new ReportEntry($path, self::REPLACEMENT_REASON);
        }

        return $value;
    }

    /** @param array<string, mixed> $record */
    private function optionalText(array $record, string $field, string $path, int $maxChars): ?string
    {
        return array_key_exists($field, $record) ? $this->text($record[$field], "{$path}.{$field}", $maxChars) : null;
    }

    private function number(mixed $value, string $path, int $minimum, int $maximum): int|float
    {
        if (! is_int($value) && ! is_float($value)) {
            $this->fail($path, 'wrong_type');
        }
        if ($value < $minimum || $value > $maximum) {
            $this->fail($path, 'out_of_range');
        }

        return $value;
    }

    private function integer(mixed $value, string $path, int $minimum, int $maximum): int
    {
        if ((is_int($value) || is_float($value)) && ! $this->isWhole($value)) {
            $this->fail($path, 'wrong_type');
        }

        return (int) $this->number($value, $path, $minimum, $maximum);
    }

    private function isWhole(int|float $number): bool
    {
        return is_int($number) || floor($number) === $number;
    }

    private function instant(int|float $milliseconds): ?CarbonImmutable
    {
        if (! $this->isWhole($milliseconds) || $milliseconds < self::FIRST_INSTANT_MS || $milliseconds > self::LAST_INSTANT_MS) {
            return null;
        }

        return CarbonImmutable::createFromTimestampMsUTC((int) $milliseconds);
    }

    private function omit(string $path, string $reason): void
    {
        $this->omitted[] = new ReportEntry($path, $reason);
    }

    private function child(string $path, string $name): string
    {
        return $path === '' ? $name : "{$path}.{$name}";
    }

    private function fail(string $path, string $reason): never
    {
        $key = $path === '' ? 'normalized' : "normalized.{$path}";

        throw ValidationException::withMessages([$key => [trans("import.{$reason}")]]);
    }
}
