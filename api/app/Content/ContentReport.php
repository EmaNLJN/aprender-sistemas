<?php

namespace App\Content;

/** What an import changes (or changed), in the terms of the `--dry-run` report. */
final readonly class ContentReport
{
    /**
     * @param  list<string>  $new  exercises that were not there
     * @param  list<string>  $gradingChanged  exercises whose grading changed
     * @param  list<string>  $textChanged  exercises whose published bytes changed but not their grading
     * @param  list<string>  $retired  exercises that leave the document
     * @param  list<string>  $reactivated  retired exercises that come back
     * @param  array<string, int>  $written  rows to write, by table
     * @param  array<string, int>  $retiredRows  rows to retire, by table
     * @param  array<string, int>  $counts  active rows by table after the import
     */
    public function __construct(
        public array $new,
        public array $gradingChanged,
        public array $textChanged,
        public array $retired,
        public array $reactivated,
        public array $written,
        public array $retiredRows,
        public array $counts,
    ) {}

    /** @return array<string, mixed> what `content_imports.changes` stores */
    public function toArray(): array
    {
        return [
            'new' => $this->new,
            'gradingChanged' => $this->gradingChanged,
            'textChanged' => $this->textChanged,
            'retired' => $this->retired,
            'reactivated' => $this->reactivated,
            'written' => (object) $this->written,
            'retiredRows' => (object) $this->retiredRows,
        ];
    }
}
