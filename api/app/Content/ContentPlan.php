<?php

namespace App\Content;

/** What an import has to do: rows to write, rows to retire and grading versions to add. */
final readonly class ContentPlan
{
    /**
     * @param  array<string, list<array<string, int|string|null>>>  $writes  new, changed or reactivated rows, by table
     * @param  array<string, list<array<string, mixed>>>  $retires  stored active rows that are no longer in the document
     * @param  list<array{exercise_id: string, grading_hash: string}>  $gradingVersions
     * @param  bool  $recordImport  whether to leave a row in `content_imports`
     */
    public function __construct(
        public array $writes,
        public array $retires,
        public array $gradingVersions,
        public bool $recordImport,
        public ContentReport $report,
    ) {}

    public function changesTables(): bool
    {
        return array_filter($this->writes) !== [] || array_filter($this->retires) !== [] || $this->gradingVersions !== [];
    }

    /** Nothing to write and nothing to record: the content is already imported. */
    public function isEmpty(): bool
    {
        return ! $this->changesTables() && ! $this->recordImport;
    }
}
