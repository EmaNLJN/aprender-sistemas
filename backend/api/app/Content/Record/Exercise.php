<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use Illuminate\Support\Arr;
use stdClass;

final readonly class Exercise
{
    public const KEYS = ['id', 'language', 'topicId', 'stage', 'level', 'challengeType', 'kind', 'minutes', 'visual', 'title', 'intro', 'why', 'objective', 'transfer', 'starter', 'solution', 'imports', 'sources', 'instructions', 'review', 'prediction', 'topic', 'workshopId', 'tests', 'hints'];

    /**
     * @param  list<ExerciseTest>  $tests
     * @param  list<ExerciseHint>  $hints
     */
    public function __construct(
        public string $id,
        public string $catalog,
        public ?string $domain,
        public int $position,
        public string $language,
        public Topic $topic,
        public int $stage,
        public ?string $level,
        public ?string $challengeType,
        public string $kind,
        public int $minutes,
        public string $visual,
        public string $title,
        public string $intro,
        public string $why,
        public string $objective,
        public string $transfer,
        public string $starter,
        public string $solution,
        public JsonValue $imports,
        public JsonValue $sources,
        public JsonValue $instructions,
        public JsonValue $review,
        public JsonValue $prediction,
        public ?string $workshopId,
        public ExerciseHashes $hashes,
        public KeyOrder $keyOrder,
        public array $tests,
        public array $hints,
    ) {}

    public static function fromDocument(stdClass $exercise, string $catalog, ?string $domain, int $position, ExerciseHashes $hashes, ?string $workshopId, string $path): self
    {
        $fields = DocumentFields::of($exercise, $path, self::KEYS);
        $topicLabel = $fields->text('topic');
        $id = $fields->text('id');
        $language = $fields->text('language');
        $topicKey = $fields->text('topicId');

        $stage = $fields->number('stage');
        $level = $fields->optionalText('level');
        $challengeType = $fields->optionalText('challengeType');
        $kind = $fields->text('kind');
        $minutes = $fields->number('minutes');
        $visual = $fields->text('visual');
        $title = $fields->text('title');
        $intro = $fields->text('intro');
        $why = $fields->text('why');
        $objective = $fields->text('objective');
        $transfer = $fields->text('transfer');
        $starter = $fields->text('starter');
        $solution = $fields->text('solution');
        $imports = $fields->json('imports');
        $sources = $fields->json('sources');
        $instructions = $fields->json('instructions');
        $review = $fields->json('review');
        $prediction = $fields->json('prediction');

        $tests = [];
        foreach (self::nonEmptyList($exercise, 'tests', $path) as $index => $test) {
            if (! $test instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}.tests[{$index}]", 'se esperaba un objeto');
            }
            $tests[] = ExerciseTest::fromDocument($test, $id, $index, "{$path}.tests[{$index}]");
        }
        $hints = [];
        foreach (self::nonEmptyList($exercise, 'hints', $path) as $index => $hint) {
            $hints[] = ExerciseHint::fromDocument($hint, $id, $index, "{$path}.hints[{$index}]");
        }

        return new self($id, $catalog, $domain, $position, $language, new Topic($language, $topicKey, $topicLabel), $stage, $level, $challengeType, $kind, $minutes, $visual, $title, $intro, $why, $objective, $transfer, $starter, $solution, $imports, $sources, $instructions, $review, $prediction, $workshopId, $hashes, $fields->keyOrder(), $tests, $hints);
    }

    /**
     * @param  array<string, mixed>  $row  an `exercises` row
     * @param  list<ExerciseTest>  $tests  the exercise's `exercise_tests`
     * @param  list<ExerciseHint>  $hints  the exercise's `exercise_hints`
     */
    public static function fromRow(array $row, array $tests, array $hints, Topic $topic): self
    {
        $fields = new RowFields($row, 'exercises');

        return new self(
            id: $fields->string('id'),
            catalog: $fields->string('catalog'),
            domain: $fields->nullableString('domain'),
            position: $fields->int('position'),
            language: $fields->string('language'),
            topic: $topic,
            stage: $fields->int('stage'),
            level: $fields->nullableString('level'),
            challengeType: $fields->nullableString('challenge_type'),
            kind: $fields->string('kind'),
            minutes: $fields->int('minutes'),
            visual: $fields->string('visual'),
            title: $fields->string('title'),
            intro: $fields->string('intro'),
            why: $fields->string('why'),
            objective: $fields->string('objective'),
            transfer: $fields->string('transfer'),
            starter: $fields->string('starter'),
            solution: $fields->string('solution'),
            imports: $fields->json('imports_json'),
            sources: $fields->json('sources_json'),
            instructions: $fields->json('instructions_json'),
            review: $fields->json('review_json'),
            prediction: $fields->json('prediction_json'),
            workshopId: $fields->nullableString('workshop_id'),
            hashes: new ExerciseHashes($fields->string('content_hash'), $fields->string('grading_hash'), $fields->string('starter_hash')),
            keyOrder: $fields->keyOrder(self::KEYS),
            tests: $tests,
            hints: $hints,
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'language' => $this->language,
            'topic_key' => $this->topic->topicKey,
            'stage' => $this->stage,
            'level' => $this->level,
            'challenge_type' => $this->challengeType,
            'kind' => $this->kind,
            'minutes' => $this->minutes,
            'visual' => $this->visual,
            'title' => $this->title,
            'intro' => $this->intro,
            'why' => $this->why,
            'objective' => $this->objective,
            'transfer' => $this->transfer,
            'starter' => $this->starter,
            'solution' => $this->solution,
            'imports_json' => $this->imports->toRow(),
            'sources_json' => $this->sources->toRow(),
            'instructions_json' => $this->instructions->toRow(),
            'review_json' => $this->review->toRow(),
            'prediction_json' => $this->prediction->toRow(),
            'catalog' => $this->catalog,
            'domain' => $this->domain,
            'position' => $this->position,
            'workshop_id' => $this->workshopId,
            'key_order' => $this->keyOrder->toRow(),
            'content_hash' => $this->hashes->contentHash,
            'grading_hash' => $this->hashes->gradingHash,
            'starter_hash' => $this->hashes->starterHash,
        ];
    }

    /** @return array<string, list<array<string, int|string|null>>> rows by table */
    public function rowsByTable(): array
    {
        $testRows = [];
        foreach ($this->testsInOrder() as $test) {
            $testRows[] = $test->toRow();
        }
        $hintRows = [];
        foreach ($this->hintsInOrder() as $hint) {
            $hintRows[] = $hint->toRow();
        }

        return [
            'exercises' => [$this->toRow()],
            'topics' => [$this->topic->toRow()],
            'exercise_tests' => $testRows,
            'exercise_hints' => $hintRows,
        ];
    }

    public function toPublished(): stdClass
    {
        $tests = [];
        foreach ($this->testsInOrder() as $test) {
            $tests[] = $test->toPublished();
        }
        $hints = [];
        foreach ($this->hintsInOrder() as $hint) {
            $hints[] = $hint->text;
        }

        return $this->keyOrder->publish([
            'id' => $this->id,
            'language' => $this->language,
            'topicId' => $this->topic->topicKey,
            'stage' => $this->stage,
            'level' => $this->level,
            'challengeType' => $this->challengeType,
            'kind' => $this->kind,
            'minutes' => $this->minutes,
            'visual' => $this->visual,
            'title' => $this->title,
            'intro' => $this->intro,
            'why' => $this->why,
            'objective' => $this->objective,
            'transfer' => $this->transfer,
            'starter' => $this->starter,
            'solution' => $this->solution,
            'imports' => $this->imports->toPublished(),
            'sources' => $this->sources->toPublished(),
            'instructions' => $this->instructions->toPublished(),
            'review' => $this->review->toPublished(),
            'prediction' => $this->prediction->toPublished(),
            'topic' => $this->topic->label,
            'workshopId' => $this->workshopId,
            'tests' => $tests,
            'hints' => $hints,
        ]);
    }

    /** @return list<ExerciseTest> */
    private function testsInOrder(): array
    {
        $tests = $this->tests;
        usort($tests, fn (ExerciseTest $a, ExerciseTest $b) => $a->position <=> $b->position);

        return $tests;
    }

    /** @return list<ExerciseHint> */
    private function hintsInOrder(): array
    {
        $hints = $this->hints;
        usort($hints, fn (ExerciseHint $a, ExerciseHint $b) => $a->position <=> $b->position);

        return $hints;
    }

    /** @return list<mixed> */
    private static function nonEmptyList(stdClass $exercise, string $key, string $path): array
    {
        $value = $exercise->{$key} ?? null;
        if (! is_array($value) || ! Arr::isList($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista no vacía');
        }

        return $value;
    }
}
