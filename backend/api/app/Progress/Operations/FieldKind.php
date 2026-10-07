<?php

namespace App\Progress\Operations;

final readonly class FieldKind
{
    /**
     * @param  list<string>  $wireFields  operation fields that feed $columns, in the same order
     * @param  list<string>  $columns
     * @param  list<string>  $binaryColumns  prose and code columns that are compared as bytes
     * @param  ?array{string, string}  $selector  wire field and value that choose this kind inside its operation
     */
    public function __construct(
        public string $name,
        public Rule $rule,
        public OperationType $operation,
        public string $table,
        public array $wireFields,
        public array $columns,
        public ?string $clockColumn,
        public array $binaryColumns = [],
        public ?array $selector = null,
    ) {}
}
