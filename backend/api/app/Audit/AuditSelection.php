<?php

namespace App\Audit;

use App\Runs\RunLanguage;

final readonly class AuditSelection
{
    /**
     * @param  list<RunLanguage>  $languages
     * @param  list<string>  $exercises
     */
    public function __construct(public array $languages, public array $exercises) {}

    /** @param  list<string>  $exercises */
    public static function fromOptions(?string $language, array $exercises): self
    {
        $unique = [];
        foreach ($exercises as $id) {
            if (! in_array($id, $unique, true)) {
                $unique[] = $id;
            }
        }
        if ($language === null) {
            return new self(RunLanguage::cases(), $unique);
        }
        $chosen = RunLanguage::tryFrom($language) ?? throw AuditRefused::invalidOption("--language admite rust o go y llegó «{$language}».");

        return new self([$chosen], $unique);
    }

    public function isFull(): bool
    {
        return count($this->languages) === count(RunLanguage::cases()) && $this->exercises === [];
    }

    public function includes(AuditedExercise $exercise): bool
    {
        return in_array($exercise->snapshot->language, $this->languages, true)
            && ($this->exercises === [] || in_array($exercise->id(), $this->exercises, true));
    }

    public function requireKnown(AuditCatalog $catalog): void
    {
        foreach ($this->exercises as $id) {
            $exercise = $catalog->find($id);
            if ($exercise === null || ! in_array($exercise->snapshot->language, $this->languages, true)) {
                throw AuditRefused::unknownExercise($id, $this->languageNames());
            }
        }
    }

    public function languageNames(): string
    {
        $names = [];
        foreach ($this->languages as $language) {
            $names[] = $language->value;
        }

        return implode(' y ', $names);
    }
}
