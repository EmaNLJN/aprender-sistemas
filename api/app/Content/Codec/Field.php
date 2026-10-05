<?php

namespace App\Content\Codec;

final readonly class Field
{
    /** @param bool $optional the key may be missing from the document: the column is then NULL */
    public function __construct(
        public string $column,
        public FieldType $type,
        public bool $optional = false,
    ) {}
}
