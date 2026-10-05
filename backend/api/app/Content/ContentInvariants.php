<?php

namespace App\Content;

use Illuminate\Support\Facades\DB;

/**
 * The rules between rows that no table constraint can express (ADR 0006 D07: only single-row
 * CHECKs and only the primary key is unique), checked with queries inside the import transaction,
 * before committing. Each query returns a row if its rule is broken.
 */
final class ContentInvariants
{
    /**
     * The tables with `position` and what groups their rows: inside a group, active rows do not
     * repeat a position.
     *
     * @var array<string, list<string>>
     */
    private const POSITION_GROUPS = [
        'exercises' => ['`catalog`', 'coalesce(`domain`, `language`)'],
        'exercise_tests' => ['`exercise_id`'],
        'workshops' => ['`domain`'],
        'workshop_objectives' => ['`workshop_id`'],
        'workshop_steps' => ['`workshop_id`'],
        'worlds' => ['`language`'],
        'atlas_concepts' => ['`language`'],
        'guide_resources' => [],
        'guide_modules' => ['`track_language`'],
        'guide_steps' => ['`module_id`'],
        'guide_step_resources' => ['`step_id`'],
    ];

    /**
     * Child, parent and join condition (`c` is the child, `p` the parent): an active row cannot
     * depend on a retired one.
     *
     * @var list<array{0: string, 1: string, 2: string}>
     */
    private const DEPENDENCIES = [
        ['exercises', 'topics', 'p.`language` = c.`language` and p.`topic_key` = c.`topic_key`'],
        ['exercises', 'catalogs', 'p.`code` = c.`catalog`'],
        ['exercises', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['exercise_tests', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['exercise_hints', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['workshop_objectives', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['workshop_steps', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['workshop_related_exercises', 'workshops', 'p.`id` = c.`workshop_id`'],
        ['workshop_related_exercises', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['world_exercises', 'worlds', 'p.`id` = c.`world_id`'],
        ['world_exercises', 'exercises', 'p.`id` = c.`exercise_id`'],
        ['atlas_concepts', 'exercises', 'p.`id` = c.`lab_exercise_id`'],
        ['guide_modules', 'guide_tracks', 'p.`language` = c.`track_language`'],
        ['guide_steps', 'guide_modules', 'p.`id` = c.`module_id`'],
        ['guide_step_resources', 'guide_steps', 'p.`id` = c.`step_id`'],
        ['guide_step_resources', 'guide_resources', 'p.`id` = c.`resource_id`'],
    ];

    /** @return list<string> one description per broken rule */
    public function violations(): array
    {
        $broken = [];
        foreach ($this->checks() as $description => $sql) {
            if (DB::selectOne($sql) !== null) {
                $broken[] = $description;
            }
        }

        return $broken;
    }

    public function assert(): void
    {
        $broken = $this->violations();
        if ($broken !== []) {
            throw new InvalidContent('Las tablas de contenido quedarían inconsistentes, así que el import no confirma: '.implode('; ', $broken).'.');
        }
    }

    /** @return array<string, string> description => query */
    private function checks(): array
    {
        $checks = [];
        foreach (self::POSITION_GROUPS as $table => $scope) {
            $group = implode(', ', [...$scope, '`position`']);
            $checks["hay filas activas de {$table} con la misma posición"] =
                "select 1 from `{$table}` where `status` = 'active' group by {$group} having count(*) > 1 limit 1";
        }
        $checks['hay filas activas de workshop_related_exercises con la misma posición en un lenguaje'] =
            "select 1 from `workshop_related_exercises` r join `exercises` e on e.`id` = r.`exercise_id` where r.`status` = 'active' group by r.`workshop_id`, e.`language`, r.`position` having count(*) > 1 limit 1";
        $checks['hay filas activas de world_exercises con la misma posición en un grupo de roles'] =
            "select 1 from `world_exercises` where `status` = 'active' group by `world_id`, (`role` = 'training'), `position` having count(*) > 1 limit 1";
        foreach (self::DEPENDENCIES as [$child, $parent, $on]) {
            $checks["hay filas activas de {$child} que dependen de {$parent} retirados"] =
                "select 1 from `{$child}` c join `{$parent}` p on {$on} where c.`status` = 'active' and p.`status` = 'deprecated' limit 1";
        }
        $checks['un mundo activo no tiene exactamente un jefe, último de sus desafíos'] =
            "select 1 from (select `world_id`, sum(`role` = 'boss') as bosses, max(case when `role` = 'boss' then `position` end) as boss_position, max(case when `role` in ('challenge', 'boss') then `position` end) as last_challenge from `world_exercises` where `status` = 'active' group by `world_id`) w where w.bosses <> 1 or w.boss_position <> w.last_challenge limit 1";
        $checks['hay mundos activos sin jefe'] =
            "select 1 from `worlds` w where w.`status` = 'active' and not exists (select 1 from `world_exercises` x where x.`world_id` = w.`id` and x.`status` = 'active' and x.`role` = 'boss') limit 1";
        $checks['la corrección vigente de un ejercicio activo no está en exercise_grading_versions'] =
            "select 1 from `exercises` e left join `exercise_grading_versions` v on v.`exercise_id` = e.`id` and v.`grading_hash` = e.`grading_hash` where e.`status` = 'active' and v.`exercise_id` is null limit 1";
        $checks['la cadena de catálogos no es única y contigua desde 1'] =
            "select 1 from (select count(*) as n, count(distinct `chain_position`) as d, min(`chain_position`) as lowest, max(`chain_position`) as highest from `catalogs` where `status` = 'active' and `chain_position` is not null) c where c.n > 0 and (c.n <> c.d or c.lowest <> 1 or c.highest <> c.n) limit 1";

        return $checks;
    }
}
