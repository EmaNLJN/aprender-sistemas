<?php

namespace App\Content;

/** The latest `content_imports` row: the validators and the content version come from it. */
final readonly class LatestImport
{
    /** @param array<string, string> $portionHashes sha256 of each portion, by name */
    public function __construct(
        public int $id,
        public string $documentHash,
        public ?string $sourceCommit,
        public array $portionHashes,
    ) {}

    /** `Content-Version`: the first 32 hex digits of the document hash. */
    public function version(): string
    {
        return substr($this->documentHash, 0, 32);
    }

    /** `ETag` of a portion: the first 32 hex digits of its hash, quoted. */
    public function etag(Portion $portion): string
    {
        return '"'.substr($this->portionHashes[$portion->value], 0, 32).'"';
    }
}
