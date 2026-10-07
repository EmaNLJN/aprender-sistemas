<?php

namespace App\Content;

use App\Content\Record\Catalog;
use App\Content\Record\ExerciseHashes;
use App\Content\Record\StepKey;
use Illuminate\Support\Arr;

/**
 * curriculum.meta.json, read and verified: the hashes and keys the generator computed, which PHP
 * stores and compares but never recomputes (ADR 0006 D10 to D14).
 */
final readonly class ContentMeta
{
    public const SHA256 = '/\A[0-9a-f]{64}\z/';

    private const COMMIT = '/\A(?:[0-9a-f]{40}|[0-9a-f]{64})\z/';

    private const FILE = 'curriculum.meta.json';

    /**
     * @param  list<string>  $languages  in the order of `languages.position`
     * @param  list<Catalog>  $catalogs
     * @param  array<string, string>  $portionHashes  sha256 of each portion, by name, in the API order
     * @param  array<string, ExerciseHashes>  $exerciseHashes  by exercise ID
     * @param  array<string, list<StepKey>>  $workshopSteps  by workshop ID, one per published step
     */
    public function __construct(
        public string $documentHash,
        public ?string $sourceCommit,
        public array $languages,
        public array $catalogs,
        public array $portionHashes,
        public array $exerciseHashes,
        public array $workshopSteps,
    ) {}

    /** @param array<mixed> $meta the decoded file, whose documentHash ContentSource already compared with the document */
    public static function fromDocument(array $meta): self
    {
        $documentHash = $meta['documentHash'] ?? null;
        if (! is_string($documentHash) || preg_match(self::SHA256, $documentHash) !== 1) {
            throw InvalidContent::at(self::FILE, 'documentHash', 'se esperaba un sha256 en hexadecimal');
        }
        $commit = $meta['sourceCommit'] ?? null;
        if ($commit !== null && (! is_string($commit) || preg_match(self::COMMIT, $commit) !== 1)) {
            throw InvalidContent::at(self::FILE, 'sourceCommit', 'se esperaba null o el hash completo de un commit');
        }

        return new self(
            $documentHash,
            $commit,
            self::languages($meta['languages'] ?? null),
            self::catalogs($meta['catalogs'] ?? null),
            self::portionHashes($meta['portions'] ?? null),
            self::exerciseHashes($meta['exercises'] ?? null),
            self::workshopSteps($meta['workshopSteps'] ?? null),
        );
    }

    public function portionHash(Portion $portion): string
    {
        return $this->portionHashes[$portion->value];
    }

    /** @return list<string> */
    private static function languages(mixed $value): array
    {
        if (! is_array($value) || $value === [] || ! Arr::isList($value)) {
            throw InvalidContent::at(self::FILE, 'languages', 'se esperaba la lista de lenguajes');
        }
        $languages = [];
        foreach ($value as $language) {
            if (! is_string($language)) {
                throw InvalidContent::at(self::FILE, 'languages', 'se esperaba la lista de lenguajes');
            }
            $languages[] = $language;
        }

        return $languages;
    }

    /** @return list<Catalog> */
    private static function catalogs(mixed $value): array
    {
        if (! is_array($value) || $value === [] || ! Arr::isList($value)) {
            throw InvalidContent::at(self::FILE, 'catalogs', 'se esperaba la lista de catálogos');
        }
        $catalogs = [];
        foreach ($value as $index => $entry) {
            $catalogs[] = Catalog::fromDocument($entry, "catalogs[{$index}]");
        }

        return $catalogs;
    }

    /** @return array<string, string> */
    private static function portionHashes(mixed $value): array
    {
        if (! is_array($value) || array_keys($value) !== Arr::pluck(Portion::cases(), 'value')) {
            throw InvalidContent::at(self::FILE, 'portions', 'se esperaban las 18 porciones, en el orden de la API');
        }
        $hashes = [];
        foreach ($value as $name => $hash) {
            if (! is_string($hash) || preg_match(self::SHA256, $hash) !== 1) {
                throw InvalidContent::at(self::FILE, "portions.{$name}", 'se esperaba un sha256 en hexadecimal');
            }
            $hashes[(string) $name] = $hash;
        }

        return $hashes;
    }

    /** @return array<string, ExerciseHashes> */
    private static function exerciseHashes(mixed $value): array
    {
        if (! is_array($value)) {
            throw InvalidContent::at(self::FILE, 'exercises', 'se esperaba un objeto con las huellas de cada ejercicio');
        }
        $hashes = [];
        foreach ($value as $id => $entry) {
            $hashes[(string) $id] = ExerciseHashes::fromDocument($entry, (string) $id);
        }

        return $hashes;
    }

    /** @return array<string, list<StepKey>> */
    private static function workshopSteps(mixed $value): array
    {
        if (! is_array($value)) {
            throw InvalidContent::at(self::FILE, 'workshopSteps', 'se esperaba un objeto con las claves de etapa de cada taller');
        }
        $steps = [];
        foreach ($value as $workshop => $keys) {
            if (! is_array($keys) || ! Arr::isList($keys)) {
                throw InvalidContent::at(self::FILE, "workshopSteps.{$workshop}", 'se esperaba una lista de claves de etapa');
            }
            $list = [];
            foreach ($keys as $index => $key) {
                $list[] = StepKey::fromDocument($key, "workshopSteps.{$workshop}[{$index}]");
            }
            $steps[(string) $workshop] = $list;
        }

        return $steps;
    }
}
