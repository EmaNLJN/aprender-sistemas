<?php

namespace App\Content;

use JsonException;
use stdClass;

/**
 * The three files tools/content generates, read and verified: curriculum.json, shaped as the API
 * publishes it, harness.json (the harness templates, the 18th portion) and curriculum.meta.json, with
 * the hashes and keys that PHP stores and compares but never recomputes (ADR 0006 D10 to D14). A meta
 * from another build is rejected: its hashes would not describe the content being imported.
 */
final readonly class ContentSource
{
    private function __construct(
        public string $document,
        public stdClass $decoded,
        public stdClass $harness,
        public ContentMeta $meta,
    ) {}

    public static function fromDirectory(string $path): self
    {
        $document = self::read($path, 'curriculum.json');
        $harnessText = self::read($path, 'harness.json');
        $metaText = self::read($path, 'curriculum.meta.json');
        $decoded = self::decode($document, 'curriculum.json', false);
        $harness = self::decode($harnessText, 'harness.json', false);
        $meta = self::decode($metaText, 'curriculum.meta.json', true);
        if (! $decoded instanceof stdClass) {
            throw InvalidContent::at('curriculum.json', '(raíz)', 'se esperaba un objeto');
        }
        if (! $harness instanceof stdClass) {
            throw InvalidContent::at('harness.json', '(raíz)', 'se esperaba un objeto');
        }
        if (! is_array($meta)) {
            throw InvalidContent::at('curriculum.meta.json', '(raíz)', 'se esperaba un objeto');
        }
        if (($meta['documentHash'] ?? null) !== hash('sha256', $document)) {
            throw new InvalidContent('curriculum.meta.json no corresponde a este curriculum.json (son de builds distintos): regeneralos juntos con npm run curriculum o reconstruí la imagen.');
        }

        $typedMeta = ContentMeta::fromDocument($meta);
        if ($typedMeta->portionHash(Portion::Harness) !== hash('sha256', $harnessText)) {
            throw new InvalidContent('harness.json no corresponde a curriculum.meta.json (son de builds distintos): regeneralos juntos con npm run curriculum o reconstruí la imagen.');
        }

        return new self($document, $decoded, $harness, $typedMeta);
    }

    public function documentHash(): string
    {
        return $this->meta->documentHash;
    }

    public function sourceCommit(): ?string
    {
        return $this->meta->sourceCommit;
    }

    /** @return list<string> in the order of `languages.position` */
    public function languages(): array
    {
        return $this->meta->languages;
    }

    public function part(Portion $portion): mixed
    {
        if ($portion === Portion::Harness) {
            return $this->harness;
        }
        $group = $this->decoded->{$portion->group()};

        return $portion->slice() === null ? $group : $group->{$portion->slice()};
    }

    private static function read(string $path, string $file): string
    {
        $full = rtrim($path, '/')."/{$file}";
        if (! is_file($full)) {
            throw new InvalidContent("{$file}: no existe en {$path}");
        }

        $text = file_get_contents($full);
        if ($text === false) {
            throw new InvalidContent("{$file}: no se pudo leer en {$path}");
        }

        return $text;
    }

    private static function decode(string $text, string $file, bool $associative): mixed
    {
        try {
            return json_decode($text, $associative, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new InvalidContent("{$file}: no es JSON válido: {$error->getMessage()}", previous: $error);
        }
    }
}
