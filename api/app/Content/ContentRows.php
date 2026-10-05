<?php

namespace App\Content;

use App\Content\Codec\AtlasCodec;
use App\Content\Codec\ExerciseCodec;
use App\Content\Codec\GuideCodec;
use App\Content\Codec\WorkshopCodec;
use App\Content\Codec\WorldCodec;
use stdClass;

/**
 * The document → the rows of every content table, with the references between records validated
 * (the generator validates the shape of each file, not that a world or the Atlas name exercises
 * that exist). Each error names the document field.
 */
final class ContentRows
{
    private const FILE = 'curriculum.json';

    public function __construct(
        private ExerciseCodec $exercises,
        private WorkshopCodec $workshops,
        private WorldCodec $worlds,
        private AtlasCodec $atlas,
        private GuideCodec $guide,
    ) {}

    public function fromSource(ContentSource $source): RowSet
    {
        $rows = new RowSet;
        $this->languagesAndCatalogs($source, $rows);
        $index = $this->indexExercises($source);
        $owners = $this->workshopOwners($source, $index);
        $this->addExercises($source, $owners, $rows);
        $this->addWorkshops($source, $index, $rows);
        $this->addWorlds($source, $index, $rows);
        $this->addAtlas($source, $index, $rows);
        $this->addGuide($source, $rows);

        return $rows;
    }

    private function languagesAndCatalogs(ContentSource $source, RowSet $rows): void
    {
        foreach ($source->languages() as $position => $code) {
            $rows->add('languages', ['code' => $code, 'position' => $position + 1]);
        }
        $chain = [];
        foreach ($source->meta['catalogs'] as $catalog) {
            $rows->add('catalogs', [
                'code' => $catalog['code'],
                'slice_by' => $catalog['sliceBy'],
                'chain_position' => $catalog['chainPosition'],
            ]);
            if ($catalog['chainPosition'] !== null) {
                $chain[] = $catalog['chainPosition'];
            }
        }
        sort($chain);
        if ($chain !== [] && $chain !== range(1, count($chain))) {
            throw InvalidContent::at('curriculum.meta.json', 'catalogs', 'la cadena de catálogos tiene que ser única y contigua, desde 1');
        }
    }

    /** @return array<string, array{catalog: string, language: string, domain: ?string}> by exercise ID */
    private function indexExercises(ContentSource $source): array
    {
        $index = [];
        foreach ($this->portions($source) as [$catalog, $slice, $list, $path]) {
            foreach ($list as $position => $exercise) {
                $id = $this->text($exercise, 'id', "{$path}[{$position}]");
                if (! ExerciseId::isValid($id)) {
                    throw InvalidContent::at(self::FILE, "{$path}[{$position}].id", "«{$id}» no es un ID de ejercicio válido: se esperaban ".ExerciseId::RULE);
                }
                if (isset($index[$id])) {
                    throw InvalidContent::at(self::FILE, "{$path}[{$position}].id", "«{$id}» se repite");
                }
                $domain = $catalog === 'cores' ? $slice : null;
                $language = $this->text($exercise, 'language', "{$path}[{$position}]");
                if (! in_array($language, $source->languages(), true) || ($domain === null && $language !== $slice)) {
                    throw InvalidContent::at(self::FILE, "{$path}[{$position}].language", "«{$language}» no corresponde a {$path}");
                }
                $index[$id] = ['catalog' => $catalog, 'language' => $language, 'domain' => $domain];
            }
        }
        foreach (array_keys($source->meta['exercises']) as $id) {
            if (! isset($index[$id])) {
                throw InvalidContent::at('curriculum.meta.json', "exercises.{$id}", 'no está en curriculum.json: regenerá los dos archivos juntos');
            }
        }

        return $index;
    }

    /**
     * The workshop that owns each core, from the `code` map of the workshops.
     *
     * @param  array<string, array{catalog: string, language: string, domain: ?string}>  $index
     * @return array<string, string> workshop ID by core ID
     */
    private function workshopOwners(ContentSource $source, array $index): array
    {
        $owners = [];
        foreach (Portion::DOMAINS as $domain) {
            foreach ($this->list($source->decoded->workshops->{$domain} ?? null, "workshops.{$domain}") as $position => $workshop) {
                $path = "workshops.{$domain}[{$position}]";
                $code = $this->languageMap($workshop->code ?? null, $source, "{$path}.code");
                foreach ($source->languages() as $language) {
                    $core = $code->{$language};
                    $known = is_string($core) ? ($index[$core] ?? null) : null;
                    if ($known === null || $known['catalog'] !== 'cores' || $known['language'] !== $language || $known['domain'] !== $domain) {
                        throw InvalidContent::at(self::FILE, "{$path}.code.{$language}", 'se esperaba un núcleo de '.$domain.' en '.$language);
                    }
                    if (isset($owners[$core])) {
                        throw InvalidContent::at(self::FILE, "{$path}.code.{$language}", "«{$core}» ya es el núcleo del taller {$owners[$core]}");
                    }
                    $owners[$core] = $this->text($workshop, 'id', $path);
                }
            }
        }

        return $owners;
    }

    /** @param array<string, string> $owners workshop ID by core ID */
    private function addExercises(ContentSource $source, array $owners, RowSet $rows): void
    {
        $topics = [];
        foreach ($this->portions($source) as [$catalog, $slice, $list, $path]) {
            foreach ($list as $position => $exercise) {
                $at = "{$path}[{$position}]";
                $id = $exercise->id;
                $hashes = $source->meta['exercises'][$id]
                    ?? throw InvalidContent::at('curriculum.meta.json', "exercises.{$id}", 'falta: regenerá los dos archivos juntos');
                if (property_exists($exercise, 'workshopId') && ($owners[$id] ?? null) !== $exercise->workshopId) {
                    throw InvalidContent::at(self::FILE, "{$at}.workshopId", 'no es el taller que lista a '.$id.' en code');
                }
                $domain = $catalog === 'cores' ? $slice : null;
                $fragment = $this->exercises->toRows($exercise, $catalog, $domain, $position, $hashes, $owners[$id] ?? null, $at);
                foreach ($fragment['topics'] as $topic) {
                    $key = "{$topic['language']}|{$topic['topic_key']}";
                    if (! isset($topics[$key])) {
                        $topics[$key] = $topic['label'];
                        $rows->add('topics', $topic);
                    } elseif ($topics[$key] !== $topic['label']) {
                        throw InvalidContent::at(self::FILE, "{$at}.topic", "el tema {$topic['topic_key']} de {$topic['language']} ya se llama «{$topics[$key]}» y acá dice «{$topic['label']}»");
                    }
                }
                unset($fragment['topics']);
                $rows->addAll($fragment);
            }
        }
    }

    /** @param array<string, array{catalog: string, language: string, domain: ?string}> $index */
    private function addWorkshops(ContentSource $source, array $index, RowSet $rows): void
    {
        foreach (Portion::DOMAINS as $domain) {
            foreach ($this->list($source->decoded->workshops->{$domain}, "workshops.{$domain}") as $position => $workshop) {
                $path = "workshops.{$domain}[{$position}]";
                $id = $workshop->id;
                $this->languageMap($workshop->bridge ?? null, $source, "{$path}.bridge");
                $related = $this->languageMap($workshop->related ?? null, $source, "{$path}.related");
                foreach ($source->languages() as $language) {
                    foreach (is_array($related->{$language}) ? $related->{$language} : [] as $at => $exerciseId) {
                        $known = is_string($exerciseId) ? ($index[$exerciseId] ?? null) : null;
                        if ($known === null || $known['language'] !== $language) {
                            throw InvalidContent::at(self::FILE, "{$path}.related.{$language}[{$at}]", 'se esperaba un ejercicio de '.$language);
                        }
                    }
                }
                $stepKeys = $source->meta['workshopSteps'][$id]
                    ?? throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$id}", 'falta: regenerá los dos archivos juntos');
                $rows->addAll($this->workshops->toRows($workshop, $domain, $position, $stepKeys, $source->languages(), $path));
            }
        }
        foreach (array_keys($source->meta['workshopSteps']) as $id) {
            if (! isset($rows->keyed('workshops')[$id])) {
                throw InvalidContent::at('curriculum.meta.json', "workshopSteps.{$id}", 'no está en curriculum.json: regenerá los dos archivos juntos');
            }
        }
    }

    /** @param array<string, array{catalog: string, language: string, domain: ?string}> $index */
    private function addWorlds(ContentSource $source, array $index, RowSet $rows): void
    {
        foreach ($source->languages() as $language) {
            foreach ($this->list($source->decoded->campaign->{$language}, "campaign.{$language}") as $position => $world) {
                $path = "campaign.{$language}[{$position}]";
                foreach ([['trainingIds', 'lab'], ['challengeIds', 'quests']] as [$key, $catalog]) {
                    foreach (is_array($world->{$key} ?? null) ? $world->{$key} : [] as $at => $exerciseId) {
                        $known = is_string($exerciseId) ? ($index[$exerciseId] ?? null) : null;
                        if ($known === null || $known['catalog'] !== $catalog || $known['language'] !== $language) {
                            throw InvalidContent::at(self::FILE, "{$path}.{$key}[{$at}]", "se esperaba un ejercicio de {$catalog} en {$language}");
                        }
                    }
                }
                $rows->addAll($this->worlds->toRows($world, $language, $position, $path));
            }
        }
    }

    /** @param array<string, array{catalog: string, language: string, domain: ?string}> $index */
    private function addAtlas(ContentSource $source, array $index, RowSet $rows): void
    {
        foreach ($source->languages() as $language) {
            foreach ($this->list($source->decoded->atlas->{$language}, "atlas.{$language}") as $position => $concept) {
                $path = "atlas.{$language}[{$position}]";
                $lab = $concept->labId ?? null;
                $known = is_string($lab) ? ($index[$lab] ?? null) : null;
                if ($known === null || $known['catalog'] !== 'lab' || $known['language'] !== $language) {
                    throw InvalidContent::at(self::FILE, "{$path}.labId", "se esperaba un ejercicio de lab en {$language}");
                }
                $rows->addAll($this->atlas->toRows($concept, $language, $position, $path));
            }
        }
    }

    private function addGuide(ContentSource $source, RowSet $rows): void
    {
        $guide = $this->guide->toRows($source->decoded->guide, $source->languages(), 'guide');
        $resources = array_column($guide['guide_resources'], 'id');
        foreach ($guide['guide_step_resources'] as $link) {
            if (! in_array($link['resource_id'], $resources, true)) {
                throw InvalidContent::at(self::FILE, "guide.steps.{$link['step_id']}.resourceIds", "«{$link['resource_id']}» no es un recurso de guide.resources");
            }
        }
        $rows->addAll($guide);
    }

    /**
     * The exercise lists (lab, quests and cores by slice) in document order: [catalog, slice, list, path].
     *
     * @return list<array{0: string, 1: string, 2: list<stdClass>, 3: string}>
     */
    private function portions(ContentSource $source): array
    {
        $portions = [];
        foreach (Portion::CATALOGS as $catalog) {
            $slices = $catalog === 'cores' ? Portion::DOMAINS : $source->languages();
            foreach ($slices as $slice) {
                $path = "{$catalog}.{$slice}";
                $portions[] = [$catalog, $slice, $this->list($source->decoded->{$catalog}->{$slice} ?? null, $path), $path];
            }
        }

        return $portions;
    }

    /** @return list<stdClass> */
    private function list(mixed $value, string $path): array
    {
        if (! is_array($value) || ! array_is_list($value)) {
            throw InvalidContent::at(self::FILE, $path, 'se esperaba una lista');
        }
        foreach ($value as $index => $item) {
            if (! $item instanceof stdClass) {
                throw InvalidContent::at(self::FILE, "{$path}[{$index}]", 'se esperaba un objeto');
            }
        }

        return $value;
    }

    private function text(stdClass $record, string $key, string $path): string
    {
        $value = $record->{$key} ?? null;
        if (! is_string($value) || trim($value) === '') {
            throw InvalidContent::at(self::FILE, "{$path}.{$key}", 'se esperaba un texto no vacío');
        }

        return $value;
    }

    private function languageMap(mixed $value, ContentSource $source, string $path): stdClass
    {
        if (! $value instanceof stdClass || array_map('strval', array_keys(get_object_vars($value))) !== $source->languages()) {
            throw InvalidContent::at(self::FILE, $path, 'un valor por lenguaje, en el orden de languages: '.implode(', ', $source->languages()));
        }

        return $value;
    }
}
