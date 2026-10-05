<?php

namespace App\Content\Codec;

use App\Content\InvalidContent;
use App\Content\PublishedJson;
use stdClass;

/**
 * Un ejercicio del documento ↔ sus filas: `exercises`, `exercise_tests`, `exercise_hints` y el
 * tema (`topics`), que comparten todos los ejercicios con el mismo `topicId`.
 */
final class ExerciseCodec
{
    private FieldMap $exercise;

    private FieldMap $test;

    public function __construct()
    {
        $this->exercise = new FieldMap([
            'id' => new Field('id', FieldType::Text),
            'language' => new Field('language', FieldType::Text),
            'topicId' => new Field('topic_key', FieldType::Text),
            'stage' => new Field('stage', FieldType::Number),
            'level' => new Field('level', FieldType::Text, optional: true),
            'challengeType' => new Field('challenge_type', FieldType::Text, optional: true),
            'kind' => new Field('kind', FieldType::Text),
            'minutes' => new Field('minutes', FieldType::Number),
            'visual' => new Field('visual', FieldType::Text),
            'title' => new Field('title', FieldType::Text),
            'intro' => new Field('intro', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'objective' => new Field('objective', FieldType::Text),
            'transfer' => new Field('transfer', FieldType::Text),
            'starter' => new Field('starter', FieldType::Text),
            'solution' => new Field('solution', FieldType::Text),
            'imports' => new Field('imports_json', FieldType::Json),
            'sources' => new Field('sources_json', FieldType::Json),
            'instructions' => new Field('instructions_json', FieldType::Json),
            'review' => new Field('review_json', FieldType::Json),
            'prediction' => new Field('prediction_json', FieldType::Json),
        ], derived: ['topic', 'workshopId', 'tests', 'hints']);

        $this->test = new FieldMap([
            'id' => new Field('test_key', FieldType::Text),
            'label' => new Field('label', FieldType::Text),
            'expression' => new Field('expression', FieldType::Text),
            'why' => new Field('why', FieldType::Text),
            'failure' => new Field('failure', FieldType::Text),
        ]);
    }

    /**
     * @param  array{contentHash: string, gradingHash: string, starterHash: string}  $hashes  del meta: PHP no las recalcula
     * @param  ?string  $workshopId  el taller dueño de un núcleo, que sale de `code` en el taller
     * @return array<string, list<array<string, int|string|null>>> filas por tabla
     */
    public function toRows(stdClass $exercise, string $catalog, ?string $domain, int $position, array $hashes, ?string $workshopId, string $path): array
    {
        $topic = $exercise->topic ?? null;
        if (! is_string($topic) || trim($topic) === '') {
            throw InvalidContent::at('curriculum.json', "{$path}.topic", 'se esperaba un texto no vacío');
        }
        $columns = $this->exercise->toColumns($exercise, $path);
        $id = $columns['id'];

        $rows = ['exercises' => [$columns + [
            'catalog' => $catalog,
            'domain' => $domain,
            'position' => $position,
            'workshop_id' => $workshopId,
            'key_order' => PublishedJson::encode(FieldMap::keysOf($exercise)),
            'content_hash' => $hashes['contentHash'],
            'grading_hash' => $hashes['gradingHash'],
            'starter_hash' => $hashes['starterHash'],
        ]]];
        $rows['topics'] = [['language' => $columns['language'], 'topic_key' => $columns['topic_key'], 'label' => $topic]];

        $rows['exercise_tests'] = [];
        foreach ($this->list($exercise, 'tests', $path) as $index => $test) {
            if (! $test instanceof stdClass) {
                throw InvalidContent::at('curriculum.json', "{$path}.tests[{$index}]", 'se esperaba un objeto');
            }
            $testColumns = $this->test->toColumns($test, "{$path}.tests[{$index}]");
            $rows['exercise_tests'][] = ['exercise_id' => $id] + $testColumns + [
                'position' => $index,
                'key_order' => PublishedJson::encode(FieldMap::keysOf($test)),
            ];
        }

        $rows['exercise_hints'] = [];
        foreach ($this->list($exercise, 'hints', $path) as $index => $hint) {
            if (! is_string($hint) || trim($hint) === '') {
                throw InvalidContent::at('curriculum.json', "{$path}.hints[{$index}]", 'se esperaba un texto no vacío');
            }
            $rows['exercise_hints'][] = ['exercise_id' => $id, 'position' => $index, 'text' => $hint];
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $exercise  fila de `exercises`
     * @param  list<array<string, mixed>>  $tests  filas de `exercise_tests` del ejercicio
     * @param  list<array<string, mixed>>  $hints  filas de `exercise_hints` del ejercicio
     */
    public function toRecord(array $exercise, array $tests, array $hints, string $topicLabel): stdClass
    {
        return $this->exercise->fromColumns($exercise, PublishedJson::decode($exercise['key_order']), [
            'topic' => $topicLabel,
            'workshopId' => $exercise['workshop_id'],
            'tests' => array_values(array_map(
                fn (array $test) => $this->test->fromColumns($test, PublishedJson::decode($test['key_order'])),
                $tests,
            )),
            'hints' => array_values(array_map(fn (array $hint) => $hint['text'], $hints)),
        ]);
    }

    /** @return list<mixed> */
    private function list(stdClass $record, string $key, string $path): array
    {
        $value = $record->{$key} ?? null;
        if (! is_array($value) || ! array_is_list($value) || $value === []) {
            throw InvalidContent::at('curriculum.json', "{$path}.{$key}", 'se esperaba una lista no vacía');
        }

        return $value;
    }
}
