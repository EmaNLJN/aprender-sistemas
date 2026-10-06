<?php

namespace App\Progress\Operations;

use App\Progress\Merge\OperationWriter;
use Carbon\CarbonImmutable;
use LogicException;

final readonly class DatabaseOperationProcessor implements OperationProcessor
{
    public function __construct(
        private OperationDecoder $decoder,
        private ContentLookup $content,
        private OperationWriter $writer,
        private ?int $userId = null,
    ) {}

    public function forAccount(int $userId): self
    {
        return new self($this->decoder, $this->content, $this->writer, $userId);
    }

    public function decode(array $raw): array
    {
        return $this->decoder->decode($raw);
    }

    public function check(array $decoded, string $currentContentVersion): array
    {
        return $this->content->check($decoded, $currentContentVersion);
    }

    public function apply(Checked $operation, ?CarbonImmutable $effectiveAt, int $revision, CarbonImmutable $now): Applied
    {
        $userId = $this->userId ?? throw new LogicException('El procesador escribe para una cuenta: llamá antes a forAccount().');

        return $this->writer->write($userId, $operation, $effectiveAt, $revision, $now);
    }
}
