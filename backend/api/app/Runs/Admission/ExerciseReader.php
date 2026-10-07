<?php

namespace App\Runs\Admission;

use App\Content\ContentSnapshot;
use App\Content\ExerciseId;
use App\Content\Record\RowFields;
use App\Runs\Program\ExerciseSnapshot;
use App\Runs\Program\ExpectedTest;
use App\Runs\RunLanguage;
use Illuminate\Support\Facades\DB;
use JsonException;
use LogicException;

final class ExerciseReader
{
    public function forRun(string $exerciseId): ?ExerciseSnapshot
    {
        if (! ExerciseId::isValid($exerciseId)) {
            return null;
        }

        return ContentSnapshot::read(fn (): ?ExerciseSnapshot => $this->read($exerciseId));
    }

    private function read(string $exerciseId): ?ExerciseSnapshot
    {
        $rows = DB::select("select `language`, `grading_hash`, `imports_json` from `exercises` where `id` = ? and `status` = 'active'", [$exerciseId]);
        if ($rows === []) {
            return null;
        }
        $exercise = new RowFields(get_object_vars($rows[0]), 'exercises');
        $language = RunLanguage::from($exercise->string('language'));

        return new ExerciseSnapshot(
            $exerciseId,
            $language,
            $exercise->string('grading_hash'),
            $this->tests($exerciseId),
            $this->imports($exercise->string('imports_json')),
            $this->template($language),
        );
    }

    /** @return list<ExpectedTest> */
    private function tests(string $exerciseId): array
    {
        $tests = [];
        $rows = DB::select(
            "select `test_key`, `expression`, `position` from `exercise_tests` where `exercise_id` = ? and `status` = 'active' order by `position`",
            [$exerciseId],
        );
        foreach ($rows as $row) {
            $fields = new RowFields(get_object_vars($row), 'exercise_tests');
            $tests[] = new ExpectedTest($fields->string('test_key'), $fields->string('expression'), $fields->int('position'));
        }

        return $tests;
    }

    private function template(RunLanguage $language): string
    {
        $rows = DB::select('select `template` from `harness_templates` where `language` = ?', [$language->value]);

        return (new RowFields($rows === [] ? [] : get_object_vars($rows[0]), 'harness_templates'))->string('template');
    }

    /** @return list<string> */
    private function imports(string $json): array
    {
        try {
            $decoded = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new LogicException('exercises.imports_json: se esperaba JSON');
        }
        $imports = [];
        foreach (is_array($decoded) ? $decoded : [] as $import) {
            if (! is_string($import)) {
                throw new LogicException('exercises.imports_json: se esperaba una lista de textos');
            }
            $imports[] = $import;
        }

        return $imports;
    }
}
