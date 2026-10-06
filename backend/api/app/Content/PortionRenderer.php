<?php

namespace App\Content;

/**
 * From the tables to the bytes the API publishes, with the caller's connection and transaction:
 * the import (inside its transaction, after writing) and the delivery (when the body is missing
 * from the cache). It is the tables-to-JSON half of the seam in ADR 0006 D10; the document half is
 * defined by the generator's hash.
 */
final class PortionRenderer
{
    public function __construct(
        private ContentReader $reader,
        private PortionAssembler $assembler,
    ) {}

    public function render(Portion $portion): string
    {
        return $this->assembler->assemble($portion, $this->reader->rows($portion), $this->reader->languages());
    }

    /** The bytes of an active exercise, or null if it does not exist or is retired. */
    public function renderExercise(string $id): ?string
    {
        $rows = $this->reader->exercise($id);

        return $rows === null
            ? null
            : PublishedJson::encode($this->assembler->exercise($rows['exercise'], $rows['tests'], $rows['hints'], $rows['topic'])->toPublished());
    }

    /** @return array<string, string> the 17 portions, by name */
    public function renderAll(): array
    {
        $bodies = [];
        foreach (Portion::cases() as $portion) {
            $bodies[$portion->value] = $this->render($portion);
        }

        return $bodies;
    }
}
