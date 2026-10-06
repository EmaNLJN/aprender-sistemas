<?php

namespace Tests\Support;

use App\Models\User;
use App\Progress\ProgressHead;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;

final class ProgressWorld
{
    /** @param array<string, mixed> $world the `world` section of merge-cases.json */
    public static function seed(array $world): void
    {
        $at = Instant::format(Instant::now());
        DB::table('languages')->insertOrIgnore([['code' => 'rust', 'position' => 1], ['code' => 'go', 'position' => 2]]);

        foreach ($world['exercises'] as $exercise) {
            self::seedExercise($exercise, $at);
        }
        foreach ($world['worlds'] as $campaignWorld) {
            self::seedWorld($campaignWorld, $at);
        }
        foreach ($world['workshops'] as $workshop) {
            self::seedWorkshop($workshop, $at);
        }
        self::seedGuide($world['guide'], $at);
        self::seedContentImport($world['contentVersion'], $at);
    }

    /** @param array<string, mixed> $state */
    public static function user(array $state = []): User
    {
        return User::factory()->create($state);
    }

    public static function head(User $user, int $epoch = 1, int $revision = 0): ProgressHead
    {
        $at = Instant::format(Instant::now());
        DB::table('progress_heads')->insert(['user_id' => $user->id, 'epoch' => $epoch, 'revision' => $revision, 'created_at' => $at, 'updated_at' => $at]);

        return ProgressHead::fromRow((array) DB::table('progress_heads')->where('user_id', $user->id)->first());
    }

    public static function contentVersion(): string
    {
        return substr(DB::table('content_imports')->orderByDesc('id')->value('document_hash'), 0, 32);
    }

    /** @param array{id: string, language: string, hints: int, predictionOptions: int} $exercise */
    private static function seedExercise(array $exercise, string $at): void
    {
        RunWorld::exercise($exercise['id'], $exercise['language']);
        DB::table('exercises')->where('id', $exercise['id'])->update(['prediction_json' => self::choice($exercise['predictionOptions'])]);
        for ($position = 1; $position <= $exercise['hints']; $position++) {
            DB::table('exercise_hints')->insert([
                'exercise_id' => $exercise['id'], 'position' => $position, 'text' => "Pista {$position}",
                'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
            ]);
        }
    }

    /** @param array{id: string, checkpointOptions: int} $world */
    private static function seedWorld(array $world, string $at): void
    {
        DB::table('worlds')->insert([
            'id' => $world['id'], 'language' => 'rust', 'position' => 1, 'level' => 'beginner', 'title' => 'Mundo', 'subtitle' => 'Subtítulo',
            'badge' => 'Insignia', 'story' => 'Historia', 'why' => 'Porque sí', 'concepts_json' => '[]', 'guide_json' => '[]',
            'checkpoint_json' => self::choice($world['checkpointOptions']), 'sources_json' => '[]', 'key_order' => '[]',
            'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
        ]);
    }

    /** @param array{id: string, predictionOptions: int, objectives: list<string>, steps: list<string>} $workshop */
    private static function seedWorkshop(array $workshop, string $at): void
    {
        DB::table('workshops')->insert([
            'id' => $workshop['id'], 'domain' => 'lowlevel', 'position' => 1, 'category' => 'machine', 'model' => 'model', 'level' => 'beginner',
            'minutes' => 10, 'title' => 'Taller', 'subtitle' => 'Subtítulo', 'story' => 'Historia', 'what' => 'Qué', 'why' => 'Porque sí',
            'limits' => 'Límites', 'uses_json' => '[]', 'prediction_json' => self::choice($workshop['predictionOptions']), 'sources_json' => '[]',
            'bridge_json' => '{}', 'key_order' => '[]', 'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
        ]);
        foreach ($workshop['objectives'] as $index => $key) {
            DB::table('workshop_objectives')->insert([
                'workshop_id' => $workshop['id'], 'objective_key' => $key, 'position' => $index + 1, 'label' => "Objetivo {$key}", 'why' => 'Porque sí',
                'key_order' => '[]', 'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
            ]);
        }
        foreach ($workshop['steps'] as $index => $key) {
            DB::table('workshop_steps')->insert([
                'workshop_id' => $workshop['id'], 'step_key' => $key, 'position' => $index + 1, 'v1_position' => $index + 1, 'title' => "Etapa {$key}",
                'task' => 'Tarea', 'why' => 'Porque sí', 'done' => 'Hecho', 'key_order' => '[]',
                'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
            ]);
        }
    }

    /** @param array{steps: list<array{id: string, quizOptions: int}>, resources: list<string>} $guide */
    private static function seedGuide(array $guide, string $at): void
    {
        if ($guide['steps'] !== []) {
            DB::table('guide_tracks')->insertOrIgnore([
                'language' => 'rust', 'title' => 'Ruta', 'description' => 'Descripción', 'key_order' => '[]',
                'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
            ]);
            DB::table('guide_modules')->insertOrIgnore([
                'id' => 'fx-module-1', 'track_language' => 'rust', 'position' => 1, 'title' => 'Módulo', 'subtitle' => 'Subtítulo', 'key_order' => '[]',
                'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
            ]);
        }
        foreach ($guide['steps'] as $index => $step) {
            DB::table('guide_steps')->insert([
                'id' => $step['id'], 'module_id' => 'fx-module-1', 'position' => $index + 1, 'title' => 'Paso', 'minutes' => 5, 'objective' => 'Objetivo',
                'task' => 'Tarea', 'done_when' => 'Hecho', 'quiz_json' => self::choice($step['quizOptions']), 'key_order' => '[]',
                'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
            ]);
        }
        foreach ($guide['resources'] as $index => $id) {
            DB::table('guide_resources')->insert([
                'id' => $id, 'position' => $index + 1, 'title' => 'Recurso', 'url' => "https://example.test/{$id}", 'languages_json' => '["rust"]',
                'category' => 'lectura', 'cost' => 'gratis', 'format' => 'Texto', 'description' => 'Descripción', 'why' => 'Porque sí', 'caveat' => 'Aviso',
                'featured' => 0, 'key_order' => '[]', 'status' => 'active', 'retired_at' => null, 'created_at' => $at, 'updated_at' => $at,
            ]);
        }
    }

    private static function seedContentImport(string $contentVersion, string $at): void
    {
        DB::table('content_imports')->insert([
            'document_hash' => $contentVersion.str_repeat('0', 32), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => $at,
        ]);
    }

    private static function choice(int $optionCount): string
    {
        $options = array_map(fn (int $number) => "Opción {$number}", range(1, $optionCount));

        return json_encode(['question' => 'Pregunta', 'options' => $options, 'answer' => 0], JSON_THROW_ON_ERROR);
    }
}
