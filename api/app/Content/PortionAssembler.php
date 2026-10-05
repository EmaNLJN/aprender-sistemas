<?php

namespace App\Content;

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;

/**
 * The rows → the bytes of a portion: the only path from the tables to what the API publishes
 * (ADR 0006 D10). It is pure and never reads the database, so the same code assembles a portion
 * from rows the import has just computed (in tests) and from rows read from the database. It sorts
 * by `position` and filters by portion: any row that is not its own is ignored.
 */
final class PortionAssembler
{
    public function __construct(
        private ExerciseCodec $exercises,
        private WorkshopCodec $workshops,
        private WorldCodec $worlds,
        private AtlasCodec $atlas,
        private GuideCodec $guide,
    ) {}

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows  active rows by table
     * @param  list<string>  $languages  in the order of `languages.position`
     */
    public function assemble(Portion $portion, array $rows, array $languages): string
    {
        return PublishedJson::encode(match ($portion->group()) {
            'lab', 'quests', 'cores' => $this->exerciseList($portion, $rows),
            'workshops' => $this->workshopList($portion, $rows, $languages),
            'campaign' => $this->worldList($portion, $rows),
            'atlas' => array_map(
                fn (array $row) => $this->atlas->toRecord($row),
                $this->inPortion($rows['atlas_concepts'], 'language', $portion->slice()),
            ),
            'guide' => $this->guide->toRecord($rows, $languages),
        });
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @return list<\stdClass>
     */
    private function exerciseList(Portion $portion, array $rows): array
    {
        $column = $portion->group() === 'cores' ? 'domain' : 'language';
        $own = array_filter(
            $rows['exercises'],
            fn (array $row) => $row['catalog'] === $portion->group() && $row[$column] === $portion->slice(),
        );
        $tests = $this->groupBy($rows['exercise_tests'], 'exercise_id');
        $hints = $this->groupBy($rows['exercise_hints'], 'exercise_id');
        $topics = [];
        foreach ($rows['topics'] as $topic) {
            $topics["{$topic['language']}|{$topic['topic_key']}"] = $topic['label'];
        }

        return array_map(
            fn (array $row) => $this->exercises->toRecord(
                $row,
                $tests[$row['id']] ?? [],
                $hints[$row['id']] ?? [],
                $topics["{$row['language']}|{$row['topic_key']}"] ?? '',
            ),
            $this->sorted($own),
        );
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $rows
     * @param  list<string>  $languages
     */
    private function workshopList(Portion $portion, array $rows, array $languages): array
    {
        $objectives = $this->groupBy($rows['workshop_objectives'], 'workshop_id');
        $steps = $this->groupBy($rows['workshop_steps'], 'workshop_id');
        $related = $this->groupBy($rows['workshop_related_exercises'], 'workshop_id');
        $languageOf = [];
        $codeOf = [];
        foreach ($rows['exercises'] as $exercise) {
            $languageOf[$exercise['id']] = $exercise['language'];
            if ($exercise['workshop_id'] !== null) {
                $codeOf[$exercise['workshop_id']][$exercise['language']] = $exercise['id'];
            }
        }

        return array_map(function (array $workshop) use ($objectives, $steps, $related, $languageOf, $codeOf, $languages) {
            $id = $workshop['id'];
            $relatedIds = [];
            foreach ($related[$id] ?? [] as $link) {
                $relatedIds[$languageOf[$link['exercise_id']] ?? ''][] = $link['exercise_id'];
            }

            return $this->workshops->toRecord($workshop, $objectives[$id] ?? [], $steps[$id] ?? [], $relatedIds, $codeOf[$id] ?? [], $languages);
        }, $this->inPortion($rows['workshops'], 'domain', $portion->slice()));
    }

    /** @param array<string, list<array<string, mixed>>> $rows */
    private function worldList(Portion $portion, array $rows): array
    {
        $members = $this->groupBy($rows['world_exercises'], 'world_id');

        return array_map(
            fn (array $world) => $this->worlds->toRecord($world, $members[$world['id']] ?? []),
            $this->inPortion($rows['worlds'], 'language', $portion->slice()),
        );
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function inPortion(array $rows, string $column, ?string $value): array
    {
        return $this->sorted(array_filter($rows, fn (array $row) => $row[$column] === $value));
    }

    /**
     * @param  array<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function sorted(array $rows): array
    {
        $rows = array_values($rows);
        usort($rows, fn (array $a, array $b) => $a['position'] <=> $b['position']);

        return $rows;
    }

    /**
     * The rows grouped by the value of a column, each group ordered by `position`.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, list<array<string, mixed>>>
     */
    private function groupBy(array $rows, string $column): array
    {
        $groups = [];
        foreach ($rows as $row) {
            $groups[$row[$column]][] = $row;
        }

        return array_map(fn (array $group) => $this->sorted($group), $groups);
    }
}
