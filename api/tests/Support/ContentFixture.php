<?php

namespace Tests\Support;

use App\Content\Portion;
use App\Content\PublishedJson;
use Closure;
use LogicException;
use stdClass;

/**
 * Una copia editable del contenido de la imagen (resources/content) para probar el import con
 * cambios. Al escribirla, recalcula el meta del documento editado con PublishedJson y su propio
 * JSON canónico. No es tautológico: ContentFixtureTest ata esas dos piezas al generador, porque
 * la copia sin cambios tiene que reproducir el meta que escribió tools/content.
 */
final class ContentFixture
{
    /** @var list<string> */
    private static array $directories = [];

    /** @param array<string, mixed> $meta */
    private function __construct(public stdClass $document, public array $meta) {}

    public static function fromImage(): self
    {
        $path = self::imagePath();

        return new self(
            json_decode(file_get_contents("{$path}/curriculum.json"), false, 512, JSON_THROW_ON_ERROR),
            json_decode(file_get_contents("{$path}/curriculum.meta.json"), true, 512, JSON_THROW_ON_ERROR),
        );
    }

    public static function imagePath(): string
    {
        return dirname(__DIR__, 2).'/resources/content';
    }

    /** El registro de un ejercicio, para editarlo en el lugar. */
    public function exercise(string $id): stdClass
    {
        foreach ($this->exerciseLists() as $list) {
            foreach ($list as $exercise) {
                if ($exercise->id === $id) {
                    return $exercise;
                }
            }
        }
        throw new LogicException("{$id} no está en el contenido");
    }

    /** Saca un ejercicio de su lista y del meta. */
    public function withoutExercise(string $id): self
    {
        foreach (['lab', 'quests', 'cores'] as $catalog) {
            foreach ($this->document->{$catalog} as $slice => $list) {
                $this->document->{$catalog}->{$slice} = array_values(array_filter($list, fn (stdClass $exercise) => $exercise->id !== $id));
            }
        }
        unset($this->meta['exercises'][$id]);

        return $this;
    }

    /** Un ejercicio del recorrido que nada referencia: se puede retirar sin romper referencias. */
    public function unreferencedLabExercise(string $language = 'rust'): string
    {
        $referenced = [];
        foreach ($this->document->campaign->{$language} as $world) {
            array_push($referenced, ...$world->trainingIds, ...$world->challengeIds);
        }
        foreach ($this->document->atlas->{$language} as $concept) {
            $referenced[] = $concept->labId;
        }
        foreach ($this->document->workshops as $workshops) {
            foreach ($workshops as $workshop) {
                array_push($referenced, ...$workshop->related->{$language});
            }
        }
        foreach ($this->document->lab->{$language} as $exercise) {
            if (! in_array($exercise->id, $referenced, true)) {
                return $exercise->id;
            }
        }
        throw new LogicException("todo el recorrido de {$language} está referenciado");
    }

    /**
     * Escribe el par en una carpeta nueva y devuelve su ruta. El documento sale con la sangría del
     * generador (null: compacto). `$editMeta` retoca el meta ya recalculado, para probar uno roto
     * con su documentHash al día.
     *
     * @param  ?Closure(array<string, mixed>): array<string, mixed>  $editMeta
     */
    public function write(?int $indent = 2, ?Closure $editMeta = null): string
    {
        $directory = sys_get_temp_dir().'/taller-content-'.bin2hex(random_bytes(6));
        mkdir($directory, 0700, true);
        self::$directories[] = $directory;
        $document = $this->documentText($indent);
        $meta = $this->recomputedMeta($document);
        file_put_contents("{$directory}/curriculum.json", $document);
        file_put_contents("{$directory}/curriculum.meta.json", json_encode($editMeta === null ? $meta : $editMeta($meta), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $directory;
    }

    public static function cleanup(): void
    {
        foreach (self::$directories as $directory) {
            array_map('unlink', glob("{$directory}/*") ?: []);
            @rmdir($directory);
        }
        self::$directories = [];
    }

    /** @return array<string, mixed> el meta con las huellas del documento actual; el resto, tal cual */
    public function recomputedMeta(string $document): array
    {
        $meta = $this->meta;
        $meta['documentHash'] = hash('sha256', $document);
        foreach (Portion::cases() as $portion) {
            $meta['portions'][$portion->value] = hash('sha256', PublishedJson::encode($this->part($portion)));
        }
        $meta['exercises'] = [];
        foreach ($this->exerciseLists() as $list) {
            foreach ($list as $exercise) {
                $meta['exercises'][$exercise->id] = [
                    'contentHash' => hash('sha256', PublishedJson::encode($exercise)),
                    'gradingHash' => hash('sha256', self::canonical([
                        'tests' => array_map(fn (stdClass $test) => ['id' => $test->id, 'expression' => $test->expression], $exercise->tests),
                        'prediction' => ['options' => $exercise->prediction->options, 'answer' => $exercise->prediction->answer],
                    ])),
                    'starterHash' => hash('sha256', self::canonical($exercise->starter)),
                ];
            }
        }

        return $meta;
    }

    public function documentText(?int $indent = 2): string
    {
        $text = PublishedJson::encode($this->document);

        // Sangría sin depender de JSON_PRETTY_PRINT (que usa 4 espacios): vuelve a codificar con la que se pida.
        return $indent === null ? $text."\n" : self::indented(json_decode($text), $indent)."\n";
    }

    private function part(Portion $portion): mixed
    {
        $group = $this->document->{$portion->group()};

        return $portion->slice() === null ? $group : $group->{$portion->slice()};
    }

    /** @return list<list<stdClass>> las 14 listas de ejercicios del documento */
    private function exerciseLists(): array
    {
        $lists = [];
        foreach (['lab', 'quests', 'cores'] as $catalog) {
            foreach ($this->document->{$catalog} as $list) {
                $lists[] = $list;
            }
        }

        return $lists;
    }

    /** JSON canónico del ADR 0004 §2: claves ordenadas en todos los niveles, sin espacios. */
    public static function canonical(mixed $value): string
    {
        return PublishedJson::encode(self::sorted($value));
    }

    private static function sorted(mixed $value): mixed
    {
        if ($value instanceof stdClass) {
            $value = (array) $value;
        }
        if (! is_array($value)) {
            return $value;
        }
        if (array_is_list($value)) {
            return array_map(self::sorted(...), $value);
        }
        ksort($value, SORT_STRING);

        return (object) array_map(self::sorted(...), $value);
    }

    private static function indented(mixed $value, int $indent, int $level = 0): string
    {
        $pad = str_repeat(' ', $indent * ($level + 1));
        $close = str_repeat(' ', $indent * $level);
        if ($value instanceof stdClass) {
            $value = get_object_vars($value);
            if ($value === []) {
                return '{}';
            }
            $items = [];
            foreach ($value as $key => $item) {
                $items[] = $pad.PublishedJson::encode((string) $key).': '.self::indented($item, $indent, $level + 1);
            }

            return "{\n".implode(",\n", $items)."\n{$close}}";
        }
        if (is_array($value)) {
            if ($value === []) {
                return '[]';
            }

            return "[\n".implode(",\n", array_map(fn ($item) => $pad.self::indented($item, $indent, $level + 1), $value))."\n{$close}]";
        }

        return PublishedJson::encode($value);
    }
}
