<?php

namespace Tests\Support;

use App\Content\Portion;
use App\Content\PublishedJson;
use Closure;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Arr;
use LogicException;
use stdClass;

/**
 * An editable copy of the image content (resources/content) to test the import with changes. When
 * written, it recomputes the meta of the edited document with PublishedJson and its own canonical
 * JSON. Not tautological: ContentFixtureTest ties both to the generator, because the unchanged
 * copy must reproduce the meta that tools/content wrote.
 */
final class ContentFixture
{
    /** @var list<string> */
    private static array $directories = [];

    /** @param array<string, mixed> $meta */
    private function __construct(public stdClass $document, public stdClass $harness, public array $meta) {}

    public static function fromImage(): self
    {
        $path = self::imagePath();

        return new self(
            json_decode(file_get_contents("{$path}/curriculum.json"), false, 512, JSON_THROW_ON_ERROR),
            json_decode(file_get_contents("{$path}/harness.json"), false, 512, JSON_THROW_ON_ERROR),
            json_decode(file_get_contents("{$path}/curriculum.meta.json"), true, 512, JSON_THROW_ON_ERROR),
        );
    }

    public static function imagePath(): string
    {
        return dirname(__DIR__, 2).'/resources/content';
    }

    public function exercise(string $id): stdClass
    {
        foreach ($this->exerciseLists() as $list) {
            foreach ($list as $exercise) {
                if ($exercise->id === $id) {
                    return $exercise;
                }
            }
        }
        throw new LogicException("{$id} is not in the content");
    }

    public function withoutExercise(string $id): self
    {
        foreach (['lab', 'quests', 'cores'] as $catalog) {
            foreach ($this->document->{$catalog} as $slice => $list) {
                $this->document->{$catalog}->{$slice} = collect($list)->reject(fn (stdClass $exercise) => $exercise->id === $id)->values()->all();
            }
        }
        unset($this->meta['exercises'][$id]);

        return $this;
    }

    public function withoutStepIds(): self
    {
        foreach ($this->document->workshops as $workshops) {
            foreach ($workshops as $workshop) {
                foreach ($workshop->steps as $step) {
                    unset($step->id);
                }
            }
        }

        return $this;
    }

    public function unreferencedLabExercise(string $language = 'rust'): string
    {
        $referenced = collect($this->document->campaign->{$language})
            ->flatMap(fn (stdClass $world) => [...$world->trainingIds, ...$world->challengeIds])
            ->concat(Arr::pluck($this->document->atlas->{$language}, 'labId'))
            ->concat(collect($this->document->workshops)->flatten(1)->flatMap(fn (stdClass $workshop) => $workshop->related->{$language}));

        return collect($this->document->lab->{$language})->pluck('id')->first(fn (string $id) => ! $referenced->containsStrict($id))
            ?? throw new LogicException("every lab exercise of {$language} is referenced");
    }

    /**
     * Writes the pair to a new directory and returns its path. The document is written with the
     * generator's indentation (null: compact). `$editMeta` tweaks the already recomputed meta, to
     * test a broken one whose documentHash is up to date.
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
        file_put_contents("{$directory}/harness.json", PublishedJson::encode($this->harness));
        file_put_contents("{$directory}/curriculum.meta.json", json_encode($editMeta === null ? $meta : $editMeta($meta), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $directory;
    }

    public static function cleanup(): void
    {
        foreach (self::$directories as $directory) {
            (new Filesystem)->deleteDirectory($directory);
        }
        self::$directories = [];
    }

    /** @return array<string, mixed> the meta with the hashes of the current document; the rest, unchanged */
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
                    'gradingHash' => hash('sha256', self::canonical(self::grading($exercise))),
                    'starterHash' => hash('sha256', self::canonical($exercise->starter)),
                ];
            }
        }

        return $meta;
    }

    public function documentText(?int $indent = 2): string
    {
        $text = PublishedJson::encode($this->document);

        // Indentation without JSON_PRETTY_PRINT (which uses 4 spaces): re-encodes with the requested one.
        return $indent === null ? $text."\n" : self::indented(json_decode($text), $indent)."\n";
    }

    /** @return array<string, mixed> what grades an exercise; the Go imports join it only when there are some */
    private static function grading(stdClass $exercise): array
    {
        $grading = [
            'tests' => Arr::map($exercise->tests, fn (stdClass $test) => ['id' => $test->id, 'expression' => $test->expression]),
            'prediction' => ['options' => $exercise->prediction->options, 'answer' => $exercise->prediction->answer],
        ];
        $imports = $exercise->language === 'go' ? array_values(array_unique($exercise->imports)) : [];
        sort($imports, SORT_STRING);
        if ($imports !== []) {
            $grading['imports'] = $imports;
        }

        return $grading;
    }

    private function part(Portion $portion): mixed
    {
        if ($portion === Portion::Harness) {
            return $this->harness;
        }
        $group = $this->document->{$portion->group()};

        return $portion->slice() === null ? $group : $group->{$portion->slice()};
    }

    /** @return list<list<stdClass>> */
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

    /** Canonical JSON of ADR 0004 §2: keys sorted at every level, no spaces. */
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
        if (Arr::isList($value)) {
            return Arr::map($value, self::sorted(...));
        }
        ksort($value, SORT_STRING);

        return (object) Arr::map($value, self::sorted(...));
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

            return "[\n".collect($value)->map(fn ($item) => $pad.self::indented($item, $indent, $level + 1))->implode(",\n")."\n{$close}]";
        }

        return PublishedJson::encode($value);
    }
}
