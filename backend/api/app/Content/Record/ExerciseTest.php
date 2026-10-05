<?php

namespace App\Content\Record;

use stdClass;

/** A test of an exercise: `tests[i]` of the document ↔ an `exercise_tests` row. */
final readonly class ExerciseTest
{
    public const KEYS = ['id', 'label', 'expression', 'why', 'failure'];

    public function __construct(
        public string $exerciseId,
        public string $testKey,
        public int $position,
        public string $label,
        public string $expression,
        public string $why,
        public string $failure,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $test, string $exerciseId, int $position, string $path): self
    {
        $fields = DocumentFields::of($test, $path, self::KEYS);

        return new self(
            exerciseId: $exerciseId,
            testKey: $fields->text('id'),
            position: $position,
            label: $fields->text('label'),
            expression: $fields->text('expression'),
            why: $fields->text('why'),
            failure: $fields->text('failure'),
            keyOrder: $fields->keyOrder(),
        );
    }

    /** @param array<string, mixed> $row an `exercise_tests` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'exercise_tests');

        return new self(
            exerciseId: $fields->string('exercise_id'),
            testKey: $fields->string('test_key'),
            position: $fields->int('position'),
            label: $fields->string('label'),
            expression: $fields->string('expression'),
            why: $fields->string('why'),
            failure: $fields->string('failure'),
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'exercise_id' => $this->exerciseId,
            'test_key' => $this->testKey,
            'label' => $this->label,
            'expression' => $this->expression,
            'why' => $this->why,
            'failure' => $this->failure,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'id' => $this->testKey,
            'label' => $this->label,
            'expression' => $this->expression,
            'why' => $this->why,
            'failure' => $this->failure,
        ]);
    }
}
