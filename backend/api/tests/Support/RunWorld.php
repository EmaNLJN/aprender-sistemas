<?php

namespace Tests\Support;

use App\Content\Record\Exercise;
use App\Models\User;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use BackedEnum;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class RunWorld
{
    private const RUST_TEMPLATE = <<<'TPL'
        {{code}}

        fn main() {
            std::panic::set_hook(Box::new(|_| {}));
        {{#tests}}
            let passed = std::panic::catch_unwind(|| { {{expression}} }).unwrap_or(false);
            println!("__TALLER_TEST__{{nonce}}:{{id}}:{}", if passed { "PASS" } else { "FAIL" });
        {{/tests}}
            println!("__TALLER_END__{{nonce}}:{{count}}");
        }

        TPL;

    private const GO_TEMPLATE = <<<'TPL'
        package main

        import (
            "fmt"
        {{#imports}}
            "{{name}}"
        {{/imports}}
        )

        {{code}}

        func __tallerCheck(id string, test func() bool) {
            passed := false
            func() {
                defer func() { _ = recover() }()
                passed = test()
            }()
            if passed {
                fmt.Println("__TALLER_TEST__{{nonce}}:" + id + ":PASS")
            } else {
                fmt.Println("__TALLER_TEST__{{nonce}}:" + id + ":FAIL")
            }
        }

        func main() {
        {{#tests}}
            __tallerCheck("{{id}}", func() bool { return {{expression}} })
        {{/tests}}
            fmt.Println("__TALLER_END__{{nonce}}:{{count}}")
        }

        TPL;

    /**
     * @param  list<array{key: string, expression: string}>  $tests
     * @param  list<string>  $imports
     */
    public static function exercise(
        string $id = 'rust-01',
        string $language = 'rust',
        array $tests = [
            ['key' => 't1', 'expression' => 'true'],
            ['key' => 't2', 'expression' => '1 + 1 == 2'],
            ['key' => 't3', 'expression' => '2 * 2 == 4'],
        ],
        array $imports = [],
    ): void {
        $at = Instant::format(Instant::now());
        $importId = self::contentImportId($at);
        self::ensureLanguages($at);
        $hash = hash('sha256', $id);

        DB::table('exercises')->insert([
            'id' => $id, 'catalog' => 'lab', 'language' => $language, 'domain' => null, 'position' => 1, 'topic_key' => 'basics',
            'stage' => 1, 'level' => null, 'challenge_type' => null, 'workshop_id' => null, 'kind' => 'completar', 'minutes' => 5,
            'visual' => 'flow', 'title' => "Ejercicio {$id}", 'intro' => 'Introducción', 'why' => 'Porque sí', 'objective' => 'Objetivo',
            'transfer' => 'Transferencia', 'starter' => 'fn main() {}', 'solution' => 'fn main() {}',
            'imports_json' => json_encode($imports, JSON_THROW_ON_ERROR), 'sources_json' => '[]', 'instructions_json' => '[]',
            'review_json' => '{}', 'prediction_json' => '{}', 'key_order' => json_encode(Exercise::KEYS, JSON_THROW_ON_ERROR),
            'content_hash' => $hash, 'grading_hash' => $hash, 'starter_hash' => $hash, 'status' => 'active', 'retired_at' => null,
            'created_at' => $at, 'updated_at' => $at,
        ]);

        foreach ($tests as $index => $test) {
            DB::table('exercise_tests')->insert([
                'exercise_id' => $id, 'test_key' => $test['key'], 'position' => $index + 1, 'label' => "Prueba {$test['key']}",
                'expression' => $test['expression'], 'why' => 'Porque sí', 'failure' => 'Falló',
                'key_order' => '["id","label","expression","why","failure"]', 'status' => 'active', 'retired_at' => null,
                'created_at' => $at, 'updated_at' => $at,
            ]);
        }

        DB::table('exercise_grading_versions')->insert(['exercise_id' => $id, 'grading_hash' => $hash, 'first_import_id' => $importId, 'created_at' => $at]);
    }

    /** @param array<string, mixed> $state */
    public static function user(array $state = []): User
    {
        return User::factory()->create($state);
    }

    /** @param array<string, mixed> $overrides columns of `runs`; enums, instants and lists are converted */
    public static function run(User $user, array $overrides = []): RunRow
    {
        $exerciseId = is_string($overrides['exercise_id'] ?? null) ? $overrides['exercise_id'] : 'rust-01';
        $existingLanguage = DB::table('exercises')->where('id', $exerciseId)->value('language');
        $language = match (true) {
            is_string($overrides['language'] ?? null) => $overrides['language'],
            is_string($existingLanguage) => $existingLanguage,
            default => 'rust',
        };
        if ($existingLanguage === null) {
            self::exercise($exerciseId, $language);
        }

        $now = Instant::now();
        $status = $overrides['status'] ?? 'queued';
        $isActive = in_array($status instanceof BackedEnum ? $status->value : $status, ['queued', 'running'], true);
        $exercise = DB::selectOne('select grading_hash from exercises where id = ?', [$exerciseId]);
        $tests = DB::table('exercise_tests')->where('exercise_id', $exerciseId)->orderBy('position')->pluck('test_key')->all();

        $row = [
            'id' => (string) Str::uuid7(), 'user_id' => $user->id, 'client_run_id' => (string) Str::uuid(), 'exercise_id' => $exerciseId,
            'language' => $language, 'epoch' => 1, 'grading_hash' => $exercise->grading_hash,
            'expected_tests' => json_encode($tests, JSON_THROW_ON_ERROR), 'nonce' => bin2hex(random_bytes(16)),
            'code' => 'fn main() {}', 'custom_test' => null, 'program' => $isActive ? 'fn main() {}' : null,
            'status' => 'queued', 'created_at' => $now, 'expires_at' => $isActive ? $now->addSeconds(600) : null,
            ...$overrides,
        ];
        DB::table('runs')->insert(array_map(self::toColumn(...), $row));

        return RunRow::fromRow((array) DB::selectOne('select * from runs where id = ?', [$row['id']]));
    }

    /** @param array<string, mixed> $overrides */
    public static function orphanRun(User $user, array $overrides = []): RunRow
    {
        $run = self::run($user, $overrides);

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        try {
            DB::delete('delete from users where id = ?', [$user->id]);
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        }

        return $run;
    }

    private static function toColumn(mixed $value): mixed
    {
        return match (true) {
            $value instanceof CarbonImmutable => Instant::format($value),
            $value instanceof BackedEnum => $value->value,
            is_array($value) => json_encode($value, JSON_THROW_ON_ERROR),
            default => $value,
        };
    }

    private static function contentImportId(string $at): int
    {
        $existing = DB::table('content_imports')->value('id');
        if (is_int($existing)) {
            return $existing;
        }

        return DB::table('content_imports')->insertGetId([
            'document_hash' => str_repeat('a', 64), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $at,
        ]);
    }

    private static function ensureLanguages(string $at): void
    {
        DB::table('languages')->insertOrIgnore([['code' => 'rust', 'position' => 1], ['code' => 'go', 'position' => 2]]);
        DB::table('catalogs')->insertOrIgnore(['code' => 'lab', 'slice_by' => 'language', 'status' => 'active', 'created_at' => $at, 'updated_at' => $at]);
        foreach (['rust', 'go'] as $language) {
            DB::table('topics')->insertOrIgnore([
                'language' => $language, 'topic_key' => 'basics', 'label' => 'Básicos', 'status' => 'active', 'created_at' => $at, 'updated_at' => $at,
            ]);
        }
        DB::table('harness_templates')->insertOrIgnore([
            ['language' => 'rust', 'template' => self::RUST_TEMPLATE],
            ['language' => 'go', 'template' => self::GO_TEMPLATE],
        ]);
    }
}
