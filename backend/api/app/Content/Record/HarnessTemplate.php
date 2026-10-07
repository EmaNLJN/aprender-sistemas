<?php

namespace App\Content\Record;

use App\Content\InvalidContent;
use stdClass;

final readonly class HarnessTemplate
{
    public function __construct(
        public string $language,
        public string $template,
    ) {}

    public static function fromDocument(stdClass $harness, string $language): self
    {
        $template = $harness->{$language} ?? null;
        if (! is_string($template) || $template === '') {
            throw InvalidContent::at('harness.json', $language, 'se esperaba el texto de la plantilla');
        }

        return new self($language, $template);
    }

    /** @param array<string, mixed> $row a `harness_templates` row */
    public static function fromRow(array $row): self
    {
        $fields = new RowFields($row, 'harness_templates');

        return new self($fields->string('language'), $fields->string('template'));
    }

    /** @return array<string, string> */
    public function toRow(): array
    {
        return ['language' => $this->language, 'template' => $this->template];
    }
}
