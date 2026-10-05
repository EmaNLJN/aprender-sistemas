<?php

namespace App\Content;

use RuntimeException;

/** The tables do not give the bytes the generator fixed for a portion: the import does not commit. */
final class ContentMismatch extends RuntimeException
{
    public static function of(Portion $portion, string $detail): self
    {
        return new self("La porción {$portion->value} armada desde las tablas no coincide con el hash de curriculum.meta.json: {$detail}");
    }
}
