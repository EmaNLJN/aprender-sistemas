<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use Illuminate\Support\Arr;
use stdClass;

/** A step of a module: `steps[i]` of the document ↔ a `guide_steps` row. */
final readonly class GuideStep
{
    public const KEYS = ['id', 'title', 'minutes', 'objective', 'task', 'doneWhen', 'quiz', 'resourceIds'];

    /** @param list<GuideStepResource> $resources in the order of `position` */
    public function __construct(
        public string $id,
        public string $moduleId,
        public int $position,
        public string $title,
        public int $minutes,
        public string $objective,
        public string $task,
        public string $doneWhen,
        public JsonValue $quiz,
        public KeyOrder $keyOrder,
        public array $resources,
    ) {}

    public static function fromDocument(stdClass $step, string $moduleId, int $position, string $path): self
    {
        $fields = DocumentFields::of($step, $path, self::KEYS);
        $id = $fields->text('id');
        $title = $fields->text('title');
        $minutes = $fields->number('minutes');
        $objective = $fields->text('objective');
        $task = $fields->text('task');
        $doneWhen = $fields->text('doneWhen');
        $quiz = $fields->json('quiz');

        return new self(
            id: $id,
            moduleId: $moduleId,
            position: $position,
            title: $title,
            minutes: $minutes,
            objective: $objective,
            task: $task,
            doneWhen: $doneWhen,
            quiz: $quiz,
            keyOrder: $fields->keyOrder(),
            resources: self::resourcesFromDocument($step->resourceIds ?? null, $id, $path),
        );
    }

    /**
     * @param  array<string, mixed>  $row  a `guide_steps` row
     * @param  list<GuideStepResource>  $resources
     */
    public static function fromRow(array $row, array $resources): self
    {
        $fields = new RowFields($row, 'guide_steps');

        return new self(
            id: $fields->string('id'),
            moduleId: $fields->string('module_id'),
            position: $fields->int('position'),
            title: $fields->string('title'),
            minutes: $fields->int('minutes'),
            objective: $fields->string('objective'),
            task: $fields->string('task'),
            doneWhen: $fields->string('done_when'),
            quiz: $fields->json('quiz_json'),
            keyOrder: $fields->keyOrder(self::KEYS),
            resources: $resources,
        );
    }

    /** @return array<string, int|string|null> */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'minutes' => $this->minutes,
            'objective' => $this->objective,
            'task' => $this->task,
            'done_when' => $this->doneWhen,
            'quiz_json' => $this->quiz->toRow(),
            'module_id' => $this->moduleId,
            'position' => $this->position,
            'key_order' => $this->keyOrder->toRow(),
        ];
    }

    public function toPublished(): stdClass
    {
        $resourceIds = [];
        foreach ($this->resources as $resource) {
            $resourceIds[] = $resource->resourceId;
        }

        return $this->keyOrder->publish([
            'id' => $this->id,
            'title' => $this->title,
            'minutes' => $this->minutes,
            'objective' => $this->objective,
            'task' => $this->task,
            'doneWhen' => $this->doneWhen,
            'quiz' => $this->quiz->toPublished(),
            'resourceIds' => $resourceIds,
        ]);
    }

    /** @return list<GuideStepResource> */
    private static function resourcesFromDocument(mixed $resourceIds, string $stepId, string $path): array
    {
        if (! is_array($resourceIds) || ! Arr::isList($resourceIds) || $resourceIds === []) {
            throw InvalidContent::at('curriculum.json', "{$path}.resourceIds", 'se esperaba una lista de recursos');
        }
        $resources = [];
        foreach ($resourceIds as $position => $resourceId) {
            if (! is_string($resourceId)) {
                $shown = PublishedJson::encode($resourceId);
                throw InvalidContent::at('curriculum.json', "guide.steps.{$stepId}.resourceIds", "«{$shown}» no es un recurso de guide.resources");
            }
            $resources[] = new GuideStepResource($stepId, $resourceId, $position);
        }

        return $resources;
    }
}
