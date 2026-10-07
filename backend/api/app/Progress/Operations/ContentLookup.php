<?php

namespace App\Progress\Operations;

use Illuminate\Support\Facades\DB;
use stdClass;

final class ContentLookup
{
    /**
     * @param  list<Decoded>  $decoded
     * @return list<Checked>
     */
    public function check(array $decoded, string $currentContentVersion): array
    {
        $operations = [];
        foreach ($decoded as $item) {
            if ($item->operation !== null) {
                $operations[] = $item->operation;
            }
        }
        $content = $this->load($operations);

        $checked = [];
        foreach ($decoded as $item) {
            $checked[] = $item->operation === null
                ? Checked::rejected($item->id, $item->hash, $item->reason ?? RejectionReason::Invalid)
                : $this->checkOne($item->operation, $content, $currentContentVersion);
        }

        return $checked;
    }

    private function checkOne(Operation $operation, LoadedContent $content, string $currentContentVersion): Checked
    {
        $reason = $this->reasonToReject($operation, $content);
        if ($reason !== null) {
            return Checked::rejected($operation->id, $operation->hash, $reason);
        }

        return Checked::ready($operation, $operation->contentVersion !== null && $operation->contentVersion !== $currentContentVersion);
    }

    private function reasonToReject(Operation $operation, LoadedContent $content): ?RejectionReason
    {
        $values = $operation->values;
        $exercise = (string) ($values['exerciseId'] ?? '');
        $workshop = (string) ($values['workshopId'] ?? '');

        return match ($operation->type) {
            OperationType::ExercisePrediction => $this->answerReason($content->exercises[$exercise]['options'] ?? null, $values['answer']),
            OperationType::ExerciseHints => $this->hintsReason($content, $exercise, (int) $values['revealed']),
            OperationType::ExerciseAssist, OperationType::ExerciseReflection, OperationType::ExerciseCustomTest,
            OperationType::ExerciseReview, OperationType::ExerciseDraft => isset($content->exercises[$exercise]) ? null : RejectionReason::UnknownReference,
            OperationType::CheckpointAnswer => $this->answerReason($content->worldOptions[(string) $values['worldId']] ?? null, $values['answer']),
            OperationType::WorkshopPrediction => $this->answerReason($content->workshopOptions[$workshop] ?? null, $values['answer']),
            OperationType::WorkshopNote => isset($content->workshopOptions[$workshop]) ? null : RejectionReason::UnknownReference,
            OperationType::WorkshopObjective => $this->existing($content->objectives, LoadedContent::pairKey($workshop, (string) $values['objectiveKey'])),
            OperationType::WorkshopStep => $this->existing($content->steps, LoadedContent::pairKey($workshop, (string) $values['stepKey'])),
            OperationType::RouteMark => $this->routeMarkReason($content, (string) $values['kind'], (string) $values['itemKey']),
            OperationType::RouteQuiz => $this->answerReason($content->guideStepOptions[(string) $values['stepId']] ?? null, $values['answer']),
            OperationType::RouteNote => null,
            OperationType::PreferenceSet => $this->preferenceReason($content, (string) $values['name'], (string) $values['value']),
        };
    }

    private function answerReason(?int $options, string|int|bool|null $answer): ?RejectionReason
    {
        if ($options === null) {
            return RejectionReason::UnknownReference;
        }

        return (int) $answer < $options ? null : RejectionReason::OutOfRange;
    }

    private function hintsReason(LoadedContent $content, string $exercise, int $revealed): ?RejectionReason
    {
        if (! isset($content->exercises[$exercise])) {
            return RejectionReason::UnknownReference;
        }

        return $revealed <= ($content->activeHints[$exercise] ?? 0) ? null : RejectionReason::OutOfRange;
    }

    /** @param array<string, true> $known */
    private function existing(array $known, string $key): ?RejectionReason
    {
        return isset($known[$key]) ? null : RejectionReason::UnknownReference;
    }

    private function routeMarkReason(LoadedContent $content, string $kind, string $itemKey): ?RejectionReason
    {
        return match ($kind) {
            'step' => isset($content->guideStepOptions[$itemKey]) ? null : RejectionReason::UnknownReference,
            'favorite' => $this->existing($content->resources, $itemKey),
            default => in_array($itemKey, RouteMilestones::KEYS, true) ? null : RejectionReason::UnknownReference,
        };
    }

    private function preferenceReason(LoadedContent $content, string $name, string $value): ?RejectionReason
    {
        $language = match ($name) {
            'labSelectedRust' => 'rust',
            'labSelectedGo' => 'go',
            default => null,
        };
        if ($language === null) {
            return null;
        }
        if (! isset($content->exercises[$value])) {
            return RejectionReason::UnknownReference;
        }

        return $content->exercises[$value]['language'] === $language ? null : RejectionReason::Invalid;
    }

    /** @param list<Operation> $operations */
    private function load(array $operations): LoadedContent
    {
        $exerciseTypes = [
            OperationType::ExercisePrediction, OperationType::ExerciseAssist, OperationType::ExerciseHints, OperationType::ExerciseReflection,
            OperationType::ExerciseCustomTest, OperationType::ExerciseReview, OperationType::ExerciseDraft,
        ];
        $exerciseIds = [...$this->fieldOf($operations, $exerciseTypes, 'exerciseId'), ...$this->labSelections($operations)];

        return new LoadedContent(
            exercises: $this->exercises($exerciseIds),
            activeHints: $this->activeHints($this->fieldOf($operations, [OperationType::ExerciseHints], 'exerciseId')),
            worldOptions: $this->optionCounts('worlds', 'checkpoint_json', $this->fieldOf($operations, [OperationType::CheckpointAnswer], 'worldId')),
            workshopOptions: $this->optionCounts('workshops', 'prediction_json', $this->fieldOf($operations, [OperationType::WorkshopPrediction, OperationType::WorkshopNote], 'workshopId')),
            objectives: $this->workshopKeys('workshop_objectives', 'objective_key', $this->pairsOf($operations, OperationType::WorkshopObjective, 'objectiveKey')),
            steps: $this->workshopKeys('workshop_steps', 'step_key', $this->pairsOf($operations, OperationType::WorkshopStep, 'stepKey')),
            guideStepOptions: $this->optionCounts('guide_steps', 'quiz_json', [...$this->fieldOf($operations, [OperationType::RouteQuiz], 'stepId'), ...$this->markedItems($operations, 'step')]),
            resources: $this->resources($this->markedItems($operations, 'favorite')),
        );
    }

    /**
     * @param  list<Operation>  $operations
     * @param  list<OperationType>  $types
     * @return list<string>
     */
    private function fieldOf(array $operations, array $types, string $field): array
    {
        $values = [];
        foreach ($operations as $operation) {
            if (in_array($operation->type, $types, true)) {
                $values[] = (string) $operation->values[$field];
            }
        }

        return $values;
    }

    /**
     * @param  list<Operation>  $operations
     * @return list<array{string, string}>
     */
    private function pairsOf(array $operations, OperationType $type, string $keyField): array
    {
        $pairs = [];
        foreach ($operations as $operation) {
            if ($operation->type === $type) {
                $pairs[] = [(string) $operation->values['workshopId'], (string) $operation->values[$keyField]];
            }
        }

        return $pairs;
    }

    /**
     * @param  list<Operation>  $operations
     * @return list<string>
     */
    private function markedItems(array $operations, string $kind): array
    {
        $items = [];
        foreach ($operations as $operation) {
            if ($operation->type === OperationType::RouteMark && $operation->values['kind'] === $kind) {
                $items[] = (string) $operation->values['itemKey'];
            }
        }

        return $items;
    }

    /**
     * @param  list<Operation>  $operations
     * @return list<string>
     */
    private function labSelections(array $operations): array
    {
        $exercises = [];
        foreach ($operations as $operation) {
            if ($operation->type === OperationType::PreferenceSet && in_array($operation->values['name'], ['labSelectedRust', 'labSelectedGo'], true)) {
                $exercises[] = (string) $operation->values['value'];
            }
        }

        return $exercises;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, array{language: string, options: int}>
     */
    private function exercises(array $ids): array
    {
        $exercises = [];
        foreach ($this->rows('exercises', 'id', $ids, ['id', 'language', 'prediction_json']) as $row) {
            $exercises[(string) $row->id] = ['language' => (string) $row->language, 'options' => $this->optionCount((string) $row->prediction_json)];
        }

        return $exercises;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, int>
     */
    private function activeHints(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $counts = [];
        $rows = DB::table('exercise_hints')->whereIn('exercise_id', array_unique($ids))->where('status', 'active')
            ->selectRaw('exercise_id, COUNT(*) AS total')->groupBy('exercise_id')->get();
        foreach ($rows as $row) {
            $counts[(string) $row->exercise_id] = (int) $row->total;
        }

        return $counts;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, int>
     */
    private function optionCounts(string $table, string $column, array $ids): array
    {
        $counts = [];
        foreach ($this->rows($table, 'id', $ids, ['id', $column]) as $row) {
            $counts[(string) $row->id] = $this->optionCount((string) $row->{$column});
        }

        return $counts;
    }

    /**
     * @param  list<array{string, string}>  $pairs
     * @return array<string, true>
     */
    private function workshopKeys(string $table, string $column, array $pairs): array
    {
        if ($pairs === []) {
            return [];
        }
        $wanted = [];
        foreach ($pairs as [$workshop, $key]) {
            $wanted[LoadedContent::pairKey($workshop, $key)] = true;
        }
        $known = [];
        $rows = DB::table($table)
            ->whereIn('workshop_id', array_unique(array_column($pairs, 0)))->whereIn($column, array_unique(array_column($pairs, 1)))
            ->get(['workshop_id', $column]);
        foreach ($rows as $row) {
            $key = LoadedContent::pairKey((string) $row->workshop_id, (string) $row->{$column});
            if (isset($wanted[$key])) {
                $known[$key] = true;
            }
        }

        return $known;
    }

    /**
     * @param  list<string>  $ids
     * @return array<string, true>
     */
    private function resources(array $ids): array
    {
        $known = [];
        foreach ($this->rows('guide_resources', 'id', $ids, ['id']) as $row) {
            $known[(string) $row->id] = true;
        }

        return $known;
    }

    /**
     * @param  list<string>  $ids
     * @param  list<string>  $columns
     * @return list<stdClass>
     */
    private function rows(string $table, string $keyColumn, array $ids, array $columns): array
    {
        if ($ids === []) {
            return [];
        }

        return array_values(DB::table($table)->whereIn($keyColumn, array_unique($ids))->get($columns)->all());
    }

    private function optionCount(string $json): int
    {
        $decoded = json_decode($json, true);
        $options = is_array($decoded) ? ($decoded['options'] ?? null) : null;

        return is_array($options) ? count($options) : 0;
    }
}
