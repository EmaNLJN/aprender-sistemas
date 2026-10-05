<?php

namespace App\Content\Record;

use stdClass;

/** A concept of the Atlas: `atlas.<language>[i]` of the document ↔ an `atlas_concepts` row. */
final readonly class AtlasConcept
{
    /** The published keys, in the order C2's AtlasCodec declared them. */
    public const KEYS = ['id', 'level', 'category', 'title', 'summary', 'why', 'code', 'explanation', 'comparison', 'pitfall', 'quiz', 'labId', 'source', 'furtherSources'];

    public function __construct(
        public string $id,
        public string $language,
        public int $position,
        public string $level,
        public string $category,
        public string $title,
        public string $summary,
        public string $why,
        public string $code,
        public string $explanation,
        public string $comparison,
        public string $pitfall,
        public JsonValue $quiz,
        public string $labExerciseId,
        public JsonValue $source,
        public ?JsonValue $furtherSources,
        public KeyOrder $keyOrder,
    ) {}

    public static function fromDocument(stdClass $concept, string $language, int $position, string $path): self
    {
        $fields = DocumentFields::of($concept, $path, self::KEYS);

        return new self(
            id: $fields->text('id'),
            language: $language,
            position: $position,
            level: $fields->text('level'),
            category: $fields->text('category'),
            title: $fields->text('title'),
            summary: $fields->text('summary'),
            why: $fields->text('why'),
            code: $fields->text('code'),
            explanation: $fields->text('explanation'),
            comparison: $fields->text('comparison'),
            pitfall: $fields->text('pitfall'),
            quiz: $fields->json('quiz'),
            labExerciseId: $fields->text('labId'),
            source: $fields->json('source'),
            furtherSources: $fields->optionalJson('furtherSources'),
            keyOrder: $fields->keyOrder(),
        );
    }

    /** @param array<string, mixed> $row an `atlas_concepts` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'atlas_concepts');

        return new self(
            id: $fields->string('id'),
            language: $fields->string('language'),
            position: $fields->int('position'),
            level: $fields->string('level'),
            category: $fields->string('category'),
            title: $fields->string('title'),
            summary: $fields->string('summary'),
            why: $fields->string('why'),
            code: $fields->string('code'),
            explanation: $fields->string('explanation'),
            comparison: $fields->string('comparison'),
            pitfall: $fields->string('pitfall'),
            quiz: $fields->json('quiz_json'),
            labExerciseId: $fields->string('lab_exercise_id'),
            source: $fields->json('source_json'),
            furtherSources: $fields->nullableJson('further_sources_json'),
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'level' => $this->level,
            'category' => $this->category,
            'title' => $this->title,
            'summary' => $this->summary,
            'why' => $this->why,
            'code' => $this->code,
            'explanation' => $this->explanation,
            'comparison' => $this->comparison,
            'pitfall' => $this->pitfall,
            'quiz_json' => $this->quiz->toRow(),
            'lab_exercise_id' => $this->labExerciseId,
            'source_json' => $this->source->toRow(),
            'further_sources_json' => $this->furtherSources?->toRow(),
            'language' => $this->language,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        return $this->keyOrder->publish([
            'id' => $this->id,
            'level' => $this->level,
            'category' => $this->category,
            'title' => $this->title,
            'summary' => $this->summary,
            'why' => $this->why,
            'code' => $this->code,
            'explanation' => $this->explanation,
            'comparison' => $this->comparison,
            'pitfall' => $this->pitfall,
            'quiz' => $this->quiz->toPublished(),
            'labId' => $this->labExerciseId,
            'source' => $this->source->toPublished(),
            'furtherSources' => $this->furtherSources?->toPublished(),
        ]);
    }
}
