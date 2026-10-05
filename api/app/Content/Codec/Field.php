<?php

namespace App\Content\Codec;

/** Una clave publicada de un registro y la columna donde se guarda. */
final readonly class Field
{
    /** @param bool $optional la clave puede faltar en el documento: la columna queda NULL */
    public function __construct(
        public string $column,
        public FieldType $type,
        public bool $optional = false,
    ) {}
}
