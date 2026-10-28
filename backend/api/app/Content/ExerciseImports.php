<?php

namespace App\Content;

use JsonException;
use LogicException;

final class ExerciseImports
{
    /** @return list<string> */
    public static function decode(string $json): array
    {
        try {
            $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new LogicException('exercises.imports_json: se esperaba JSON');
        }
        $imports = [];
        foreach (is_array($decoded) ? $decoded : [] as $import) {
            if (! is_string($import)) {
                throw new LogicException('exercises.imports_json: se esperaba una lista de textos');
            }
            $imports[] = $import;
        }

        return $imports;
    }
}
