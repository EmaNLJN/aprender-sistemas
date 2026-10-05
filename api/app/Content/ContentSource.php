<?php

namespace App\Content;

use JsonException;
use stdClass;

/**
 * The two files tools/content generates, read and verified: curriculum.json, shaped as the API
 * publishes it, and curriculum.meta.json, with the hashes and keys that PHP stores and compares
 * but never recomputes (ADR 0006 D10 to D14). A meta from another build is rejected: its hashes
 * would not describe the content being imported.
 */
final readonly class ContentSource
{
    private const SHA256 = '/\A[0-9a-f]{64}\z/';

    private const COMMIT = '/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/';

    /** @param array<string, mixed> $meta */
    private function __construct(public string $document, public stdClass $decoded, public array $meta) {}

    public static function fromDirectory(string $path): self
    {
        $document = self::read($path, 'curriculum.json');
        $metaText = self::read($path, 'curriculum.meta.json');
        $decoded = self::decode($document, 'curriculum.json', false);
        $meta = self::decode($metaText, 'curriculum.meta.json', true);
        if (! $decoded instanceof stdClass) {
            throw InvalidContent::at('curriculum.json', '(raíz)', 'se esperaba un objeto');
        }
        if (! is_array($meta)) {
            throw InvalidContent::at('curriculum.meta.json', '(raíz)', 'se esperaba un objeto');
        }
        if (($meta['documentHash'] ?? null) !== hash('sha256', $document)) {
            throw new InvalidContent('curriculum.meta.json no corresponde a este curriculum.json (son de builds distintos): regeneralos juntos con npm run curriculum o reconstruí la imagen.');
        }
        self::validateMeta($meta);

        return new self($document, $decoded, $meta);
    }

    public function documentHash(): string
    {
        return $this->meta['documentHash'];
    }

    public function sourceCommit(): ?string
    {
        return $this->meta['sourceCommit'];
    }

    /** @return list<string> in the order of `languages.position` */
    public function languages(): array
    {
        return $this->meta['languages'];
    }

    public function part(Portion $portion): mixed
    {
        $group = $this->decoded->{$portion->group()};

        return $portion->slice() === null ? $group : $group->{$portion->slice()};
    }

    private static function read(string $path, string $file): string
    {
        $full = rtrim($path, '/')."/{$file}";
        if (! is_file($full)) {
            throw new InvalidContent("{$file}: no existe en {$path}");
        }

        return file_get_contents($full);
    }

    private static function decode(string $text, string $file, bool $associative): mixed
    {
        try {
            return json_decode($text, $associative, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new InvalidContent("{$file}: no es JSON válido: {$error->getMessage()}", previous: $error);
        }
    }

    /** @param array<string, mixed> $meta */
    private static function validateMeta(array $meta): void
    {
        $fail = fn (string $path, string $problem) => throw InvalidContent::at('curriculum.meta.json', $path, $problem);
        $isHash = fn (mixed $value): bool => is_string($value) && preg_match(self::SHA256, $value) === 1;

        $commit = $meta['sourceCommit'] ?? null;
        if ($commit !== null && (! is_string($commit) || preg_match(self::COMMIT, $commit) !== 1)) {
            $fail('sourceCommit', 'se esperaba null o el hash completo de un commit');
        }
        $languages = $meta['languages'] ?? null;
        if (! is_array($languages) || $languages === [] || ! array_is_list($languages) || array_filter($languages, 'is_string') !== $languages) {
            $fail('languages', 'se esperaba la lista de lenguajes');
        }
        $catalogs = $meta['catalogs'] ?? null;
        if (! is_array($catalogs) || $catalogs === [] || ! array_is_list($catalogs)) {
            $fail('catalogs', 'se esperaba la lista de catálogos');
        }
        foreach ($catalogs as $index => $catalog) {
            $position = is_array($catalog) ? ($catalog['chainPosition'] ?? null) : null;
            if (! is_array($catalog) || ! is_string($catalog['code'] ?? null)
                || ! in_array($catalog['sliceBy'] ?? null, ['language', 'domain'], true)
                || ($position !== null && (! is_int($position) || $position < 1))) {
                $fail("catalogs[{$index}]", 'se esperaba {code, sliceBy, chainPosition}');
            }
        }
        $portions = $meta['portions'] ?? null;
        $names = array_map(fn (Portion $portion) => $portion->value, Portion::cases());
        if (! is_array($portions) || array_keys($portions) !== $names) {
            $fail('portions', 'se esperaban las 17 porciones, en el orden de la API');
        }
        foreach ($portions as $name => $hash) {
            if (! $isHash($hash)) {
                $fail("portions.{$name}", 'se esperaba un sha256 en hexadecimal');
            }
        }
        $exercises = $meta['exercises'] ?? null;
        if (! is_array($exercises)) {
            $fail('exercises', 'se esperaba un objeto con las huellas de cada ejercicio');
        }
        foreach ($exercises as $id => $hashes) {
            foreach (['contentHash', 'gradingHash', 'starterHash'] as $key) {
                if (! is_array($hashes) || ! $isHash($hashes[$key] ?? null)) {
                    $fail("exercises.{$id}.{$key}", 'se esperaba un sha256 en hexadecimal');
                }
            }
        }
        $steps = $meta['workshopSteps'] ?? null;
        if (! is_array($steps)) {
            $fail('workshopSteps', 'se esperaba un objeto con las claves de etapa de cada taller');
        }
        foreach ($steps as $workshop => $keys) {
            if (! is_array($keys) || ! array_is_list($keys)) {
                $fail("workshopSteps.{$workshop}", 'se esperaba una lista de claves de etapa');
            }
            foreach ($keys as $index => $key) {
                $v1 = is_array($key) ? ($key['v1Index'] ?? null) : null;
                if (! is_array($key) || ! is_string($key['id'] ?? null) || ($v1 !== null && (! is_int($v1) || $v1 < 0))) {
                    $fail("workshopSteps.{$workshop}[{$index}]", 'se esperaba {id, v1Index}');
                }
            }
        }
    }
}
