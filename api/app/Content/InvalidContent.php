<?php

namespace App\Content;

use RuntimeException;

final class InvalidContent extends RuntimeException
{
    public static function at(string $file, string $path, string $problem): self
    {
        return new self("{$file}: {$path}: {$problem}");
    }
}
