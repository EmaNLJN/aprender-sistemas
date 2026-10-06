<?php

namespace App\Content\Record;

use App\Content\ContentMeta;
use App\Content\InvalidContent;

/** The three hashes the generator computed for an exercise; PHP stores them and never recomputes them. */
final readonly class ExerciseHashes
{
    public function __construct(
        public string $contentHash,
        public string $gradingHash,
        public string $starterHash,
    ) {}

    public static function fromDocument(mixed $hashes, string $exerciseId): self
    {
        $read = function (string $key) use ($hashes, $exerciseId): string {
            $value = is_array($hashes) ? ($hashes[$key] ?? null) : null;
            if (! is_string($value) || preg_match(ContentMeta::SHA256, $value) !== 1) {
                throw InvalidContent::at('curriculum.meta.json', "exercises.{$exerciseId}.{$key}", 'se esperaba un sha256 en hexadecimal');
            }

            return $value;
        };

        return new self($read('contentHash'), $read('gradingHash'), $read('starterHash'));
    }
}
