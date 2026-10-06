<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use Illuminate\Support\Arr;
use stdClass;

/**
 * A Systems workshop: `workshops.<domain>[i]` of the document ↔ a `workshops` row with its
 * objectives, steps and related exercises. The `code` map has no table: it comes from
 * `exercises.workshop_id`.
 */
final readonly class Workshop
{
    public const KEYS = ['id', 'category', 'model', 'level', 'minutes', 'title', 'subtitle', 'story', 'what', 'why', 'limits', 'uses', 'prediction', 'sources', 'bridge', 'objectives', 'steps', 'code', 'related'];

    /**
     * @param  list<WorkshopObjective>  $objectives
     * @param  list<WorkshopStep>  $steps
     * @param  array<string, list<WorkshopRelatedExercise>>  $related  by language
     * @param  array<string, string>  $code  core ID by language
     * @param  list<string>  $languages  in the order of `languages.position`
     */
    public function __construct(
        public string $id,
        public string $domain,
        public int $position,
        public string $category,
        public string $model,
        public string $level,
        public int $minutes,
        public string $title,
        public string $subtitle,
        public string $story,
        public string $what,
        public string $why,
        public string $limits,
        public JsonValue $uses,
        public JsonValue $prediction,
        public JsonValue $sources,
        public JsonValue $bridge,
        public array $objectives,
        public array $steps,
        public array $related,
        public array $code,
        public array $languages,
        public KeyOrder $keyOrder,
    ) {}

    /**
     * @param  list<StepKey>  $stepKeys  from the meta, one per published step
     * @param  list<string>  $languages  in the order of `languages.position`
     * @param  array<string, string>  $code  core ID by language
     * @param  array<string, list<string>>  $related  exercise IDs by language
     */
    public static function fromDocument(stdClass $workshop, string $domain, int $position, array $stepKeys, array $languages, array $code, array $related, string $path): self
    {
        $fields = DocumentFields::of($workshop, $path, self::KEYS);
        $id = $fields->text('id');
        $category = $fields->text('category');
        $model = $fields->text('model');
        $level = $fields->text('level');
        $minutes = $fields->number('minutes');
        $title = $fields->text('title');
        $subtitle = $fields->text('subtitle');
        $story = $fields->text('story');
        $what = $fields->text('what');
        $why = $fields->text('why');
        $limits = $fields->text('limits');
        $uses = $fields->json('uses');
        $prediction = $fields->json('prediction');
        $sources = $fields->json('sources');
        $bridge = $fields->json('bridge');

        $objectives = [];
        foreach (self::objects($workshop, 'objectives', $path) as $index => $objective) {
            $objectives[] = WorkshopObjective::fromDocument($objective, $id, $index, "{$path}.objectives[{$index}]");
        }

        $stepObjects = self::objects($workshop, 'steps', $path);
        if (count($stepObjects) !== count($stepKeys)) {
            throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$id}", count($stepKeys).' claves para '.count($stepObjects).' etapas: regenerá los dos archivos juntos');
        }
        $steps = [];
        foreach ($stepObjects as $index => $step) {
            $steps[] = WorkshopStep::fromDocument($step, $id, $index, $stepKeys[$index], "{$path}.steps[{$index}]");
        }

        $relatedExercises = [];
        foreach ($related as $language => $exerciseIds) {
            $relatedExercises[$language] = [];
            foreach ($exerciseIds as $index => $exerciseId) {
                $relatedExercises[$language][] = new WorkshopRelatedExercise($id, $exerciseId, $index);
            }
        }

        return new self($id, $domain, $position, $category, $model, $level, $minutes, $title, $subtitle, $story, $what, $why, $limits, $uses, $prediction, $sources, $bridge, $objectives, $steps, $relatedExercises, $code, $languages, $fields->keyOrder());
    }

    /**
     * @param  array<string, mixed>  $row  a `workshops` row
     * @param  list<WorkshopObjective>  $objectives  the workshop's objectives, in `position` order
     * @param  list<WorkshopStep>  $steps  the workshop's steps, in `position` order
     * @param  array<string, list<WorkshopRelatedExercise>>  $related  by language
     * @param  array<string, string>  $code  core ID by language
     * @param  list<string>  $languages  in the order of `languages.position`
     */
    public static function fromRow(array $row, array $objectives, array $steps, array $related, array $code, array $languages): self
    {
        $fields = new RowFields($row, 'workshops');

        return new self(
            id: $fields->string('id'),
            domain: $fields->string('domain'),
            position: $fields->int('position'),
            category: $fields->string('category'),
            model: $fields->string('model'),
            level: $fields->string('level'),
            minutes: $fields->int('minutes'),
            title: $fields->string('title'),
            subtitle: $fields->string('subtitle'),
            story: $fields->string('story'),
            what: $fields->string('what'),
            why: $fields->string('why'),
            limits: $fields->string('limits'),
            uses: $fields->json('uses_json'),
            prediction: $fields->json('prediction_json'),
            sources: $fields->json('sources_json'),
            bridge: $fields->json('bridge_json'),
            objectives: $objectives,
            steps: $steps,
            related: $related,
            code: $code,
            languages: $languages,
            keyOrder: $fields->keyOrder(self::KEYS),
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'model' => $this->model,
            'level' => $this->level,
            'minutes' => $this->minutes,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'story' => $this->story,
            'what' => $this->what,
            'why' => $this->why,
            'limits' => $this->limits,
            'uses_json' => $this->uses->toRow(),
            'prediction_json' => $this->prediction->toRow(),
            'sources_json' => $this->sources->toRow(),
            'bridge_json' => $this->bridge->toRow(),
            'domain' => $this->domain,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    /** @return array<string, list<array<string, int|string|null>>> rows by table */
    public function rowsByTable(): array
    {
        $objectiveRows = [];
        foreach ($this->objectives as $objective) {
            $objectiveRows[] = $objective->toRow();
        }

        $stepRows = [];
        foreach ($this->steps as $step) {
            $stepRows[] = $step->toRow();
        }

        $relatedRows = [];
        foreach ($this->languages as $language) {
            foreach ($this->related[$language] ?? [] as $relatedExercise) {
                $relatedRows[] = $relatedExercise->toRow();
            }
        }

        return [
            'workshops' => [$this->toRow()],
            'workshop_objectives' => $objectiveRows,
            'workshop_steps' => $stepRows,
            'workshop_related_exercises' => $relatedRows,
        ];
    }

    public function toPublished(): stdClass
    {
        $objectives = [];
        foreach ($this->objectives as $objective) {
            $objectives[] = $objective->toPublished();
        }

        $steps = [];
        foreach ($this->steps as $step) {
            $steps[] = $step->toPublished();
        }

        return $this->keyOrder->publish([
            'id' => $this->id,
            'category' => $this->category,
            'model' => $this->model,
            'level' => $this->level,
            'minutes' => $this->minutes,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'story' => $this->story,
            'what' => $this->what,
            'why' => $this->why,
            'limits' => $this->limits,
            'uses' => $this->uses->toPublished(),
            'prediction' => $this->prediction->toPublished(),
            'sources' => $this->sources->toPublished(),
            'bridge' => $this->bridge->toPublished(),
            'objectives' => $objectives,
            'steps' => $steps,
            'code' => $this->codeByLanguage(),
            'related' => $this->relatedByLanguage(),
        ]);
    }

    private function codeByLanguage(): stdClass
    {
        $byLanguage = new stdClass;
        foreach ($this->languages as $language) {
            $byLanguage->{$language} = $this->code[$language] ?? null;
        }

        return $byLanguage;
    }

    private function relatedByLanguage(): stdClass
    {
        $byLanguage = new stdClass;
        foreach ($this->languages as $language) {
            $byLanguage->{$language} = isset($this->related[$language]) ? self::exerciseIdsInOrder($this->related[$language]) : null;
        }

        return $byLanguage;
    }

    /**
     * @param  list<WorkshopRelatedExercise>  $related
     * @return list<string>
     */
    private static function exerciseIdsInOrder(array $related): array
    {
        usort($related, fn (WorkshopRelatedExercise $a, WorkshopRelatedExercise $b) => $a->position <=> $b->position);

        $ids = [];
        foreach ($related as $relatedExercise) {
            $ids[] = $relatedExercise->exerciseId;
        }

        return $ids;
    }

    /** @return list<stdClass> */
    private static function objects(stdClass $workshop, string $key, string $path): array
    {
        $value = $workshop->{$key} ?? null;
        if (! is_array($value) || ! Arr::isList($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista no vacía');
        }

        $objects = [];
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}.{$key}[{$index}]", 'se esperaba un objeto');
            }
            $objects[] = $item;
        }

        return $objects;
    }
}
