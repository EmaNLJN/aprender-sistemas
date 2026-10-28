<?php

namespace App\Audit;

use App\Content\ContentImports;
use App\Content\ContentSnapshot;
use App\Content\ContentSource;
use App\Content\ExerciseImports;
use App\Content\Portion;
use App\Content\Record\RowFields;
use App\Runs\Program\ExerciseSnapshot;
use App\Runs\Program\ExpectedTest;
use App\Runs\RunLanguage;
use Illuminate\Support\Facades\DB;
use LogicException;

final class AuditCatalogReader
{
    private const EXERCISES = 'select `id`, `language`, `catalog`, `domain`, `kind`, `grading_hash`, `starter_hash`, `imports_json`, `starter`, `solution`'
        ." from `exercises` where `status` = 'active' and `language` in ('rust', 'go')"
        ." order by field(`language`, 'rust', 'go'), field(`catalog`, 'lab', 'quests', 'cores'), `domain`, `position`, `id`";

    private const TESTS = 'select t.`exercise_id`, t.`test_key`, t.`expression`, t.`position`, t.`label`'
        .' from `exercise_tests` t join `exercises` e on e.`id` = t.`exercise_id`'
        ." where t.`status` = 'active' and e.`status` = 'active'"
        .' order by t.`exercise_id`, t.`position`';

    public function __construct(private ContentImports $imports) {}

    public function read(): AuditCatalog
    {
        $catalog = ContentSnapshot::read(fn (): AuditCatalog => $this->readSnapshot());
        $source = ContentSource::fromDirectory(config()->string('content.path'));
        if ($catalog->documentHash !== $source->documentHash()) {
            throw AuditRefused::staleContent($catalog->documentHash, $source->documentHash());
        }
        $imageHarnessHash = $source->meta->portionHash(Portion::Harness);
        if ($catalog->harnessHash !== $imageHarnessHash) {
            throw AuditRefused::staleHarness($catalog->harnessHash, $imageHarnessHash);
        }

        return $catalog;
    }

    private function readSnapshot(): AuditCatalog
    {
        $import = $this->imports->latest() ?? throw AuditRefused::noContent();
        $harnessHash = $import->portionHashes['harness'] ?? throw AuditRefused::noContent();
        $templates = $this->templates();
        $tests = $this->tests();
        $exercises = [];
        foreach (DB::select(self::EXERCISES) as $row) {
            $exercises[] = $this->exercise(new RowFields(get_object_vars($row), 'exercises'), $templates, $tests);
        }

        return new AuditCatalog($import->documentHash, $harnessHash, $import->sourceCommit, $exercises);
    }

    /**
     * @param  array<string, string>  $templates
     * @param  array<string, list<array{test: ExpectedTest, label: string}>>  $tests
     */
    private function exercise(RowFields $row, array $templates, array $tests): AuditedExercise
    {
        $id = $row->string('id');
        $language = RunLanguage::from($row->string('language'));
        $expected = [];
        $labels = [];
        foreach ($tests[$id] ?? [] as $entry) {
            $expected[] = $entry['test'];
            $labels[] = $entry['label'];
        }
        $template = $templates[$language->value] ?? throw new LogicException("harness_templates: falta la plantilla de {$language->value}");

        return new AuditedExercise(
            new ExerciseSnapshot($id, $language, $row->string('grading_hash'), $expected, ExerciseImports::decode($row->string('imports_json')), $template),
            $row->string('catalog'),
            $row->nullableString('domain'),
            ExerciseKind::from($row->string('kind')),
            $row->string('starter_hash'),
            $row->string('starter'),
            $row->string('solution'),
            $labels,
        );
    }

    /** @return array<string, string> */
    private function templates(): array
    {
        $templates = [];
        foreach (DB::select('select `language`, `template` from `harness_templates`') as $row) {
            $fields = new RowFields(get_object_vars($row), 'harness_templates');
            $templates[$fields->string('language')] = $fields->string('template');
        }

        return $templates;
    }

    /** @return array<string, list<array{test: ExpectedTest, label: string}>> */
    private function tests(): array
    {
        $tests = [];
        foreach (DB::select(self::TESTS) as $row) {
            $fields = new RowFields(get_object_vars($row), 'exercise_tests');
            $tests[$fields->string('exercise_id')][] = [
                'test' => new ExpectedTest($fields->string('test_key'), $fields->string('expression'), $fields->int('position')),
                'label' => $fields->string('label'),
            ];
        }

        return $tests;
    }
}
