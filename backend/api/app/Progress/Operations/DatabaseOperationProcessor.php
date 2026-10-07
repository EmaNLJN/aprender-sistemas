<?php

namespace App\Progress\Operations;

use App\Progress\Merge\OperationWriter;
use Carbon\CarbonImmutable;

final readonly class DatabaseOperationProcessor implements OperationProcessor
{
    public function __construct(
        private OperationDecoder $decoder,
        private ContentLookup $content,
        private OperationWriter $writer,
    ) {}

    public function decode(array $raw): array
    {
        return $this->decoder->decode($raw);
    }

    public function check(array $decoded, string $currentContentVersion): array
    {
        return $this->content->check($decoded, $currentContentVersion);
    }

    public function apply(int $userId, Checked $operation, ?CarbonImmutable $effectiveAt, int $revision, CarbonImmutable $now): Applied
    {
        return $this->writer->write($userId, $operation, $effectiveAt, $revision, $now);
    }
}
