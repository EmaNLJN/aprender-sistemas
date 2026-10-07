<?php

namespace App\Progress\Operations;

final readonly class OperationSpec
{
    /**
     * @param  array<string, string>  $keyColumns  the wire field that feeds each primary key column after user_id
     * @param  list<FieldSpec>  $fields
     */
    public function __construct(
        public OperationType $type,
        public array $keyColumns,
        public array $fields,
    ) {}
}
