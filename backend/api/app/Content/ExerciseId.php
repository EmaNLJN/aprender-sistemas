<?php

namespace App\Content;

/**
 * The shape of an exercise ID (FR-015). `/api/exercises/{id}` answers 404 to any other, without
 * querying the database, so the import accepts no other either: an exercise with that ID would be
 * stored and never served. The pattern ends in `\z` because `$` also matches before a final line break.
 */
final class ExerciseId
{
    /** The rule in words, for the message that rejects an ID: keep it in step with the pattern. */
    public const RULE = 'minúsculas, dígitos y guiones, de 1 a 64 caracteres y sin empezar con guion';

    private const PATTERN = '/\A[a-z0-9][a-z0-9-]{0,63}\z/';

    public static function isValid(string $id): bool
    {
        return preg_match(self::PATTERN, $id) === 1;
    }
}
