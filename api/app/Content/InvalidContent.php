<?php

namespace App\Content;

use RuntimeException;

/** Un curriculum.json o un curriculum.meta.json que content:import no puede cargar. */
final class InvalidContent extends RuntimeException
{
    /** El mensaje nombra el archivo y el campo, como los del generador (tools/content/). */
    public static function at(string $file, string $path, string $problem): self
    {
        return new self("{$file}: {$path}: {$problem}");
    }
}
