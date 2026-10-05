<?php

use App\Content\BodyCache;
use App\Content\ContentImports;
use App\Content\ContentInvariants;
use App\Content\Portion;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\ContentDatabase;
use Tests\Support\ContentFixture;

afterEach(fn () => ContentFixture::cleanup());

function useContentAt(string $directory): void
{
    config(['content.path' => $directory]);
}

/** Runs content:import for a setup step, and fails with its output if it does not succeed. */
function importContent(): void
{
    $code = Artisan::call('content:import');
    if ($code !== 0) {
        throw new RuntimeException("content:import exited with {$code}: ".Artisan::output());
    }
}

/** Asked from another connection: the lock is re-entrant, so the connection that took it cannot tell if it leaked. */
function importLockIsFree(): bool
{
    return (int) DB::connectUsing('lock-probe', config('database.connections.mysql'), true)
        ->scalar("select is_free_lock(concat(database(), ':content-import'))") === 1;
}

function importImageContent(): void
{
    useContentAt(ContentFixture::imagePath());
    importContent();
}

it('imports the image content: the 21 tables, its record and the 274 grading versions', function () {
    $this->artisan('content:import')->expectsOutputToContain('Importado el contenido sha256')->assertExitCode(0);

    $meta = json_decode(file_get_contents(ContentFixture::imagePath().'/curriculum.meta.json'), true);
    expect(ContentDatabase::counts())->toBe([
        'languages' => 2, 'catalogs' => 3, 'content_imports' => 1, 'topics' => 98, 'workshops' => 25, 'exercises' => 274,
        'exercise_grading_versions' => 274, 'exercise_tests' => 822, 'exercise_hints' => 822, 'workshop_objectives' => 75,
        'workshop_steps' => 100, 'workshop_related_exercises' => 118, 'worlds' => 8, 'world_exercises' => 48,
        'atlas_concepts' => 32, 'guide_resources' => 15, 'guide_sources' => 9, 'guide_tracks' => 2, 'guide_modules' => 8,
        'guide_steps' => 24, 'guide_step_resources' => 56,
    ]);
    $import = DB::table('content_imports')->sole();
    expect($import->document_hash)->toBe($meta['documentHash'])
        ->and($import->source_commit)->toBeNull()
        ->and(json_decode($import->portion_hashes, true))->toEqualCanonicalizing($meta['portions'])
        ->and(json_decode($import->counts, true))->toMatchArray(['exercises' => 274, 'exercise_tests' => 822, 'workshops' => 25, 'atlas_concepts' => 32])
        ->and(json_decode($import->changes, true)['new'])->toHaveCount(274)
        ->and(DB::table('exercises')->where('status', 'active')->count())->toBe(274)
        // FR-032: lab, quests and cores have no position in the chain until Essentials arrives.
        ->and(DB::table('catalogs')->pluck('chain_position', 'code')->all())->toBe(['cores' => null, 'lab' => null, 'quests' => null])
        ->and(importLockIsFree())->toBeTrue();
});

it('with the same content it writes nothing: migrate runs it on every up', function () {
    importImageContent();
    $checksums = ContentDatabase::checksums();

    $writes = ContentDatabase::contentWritesDuring(function () {
        $this->artisan('content:import')->expectsOutputToContain('ya está importado')->assertExitCode(0);
    });

    expect($writes)->toBe([])->and(ContentDatabase::checksums())->toBe($checksums);
});

it('warms the body cache with the 17 portions', function () {
    importImageContent();
    $hashes = json_decode(DB::table('content_imports')->value('portion_hashes'), true);

    foreach (Portion::cases() as $portion) {
        $missing = ! app(BodyCache::class)->has($portion, $hashes[$portion->value]) ? $portion->value : null;
        expect($missing)->toBeNull();
    }
});

it('retires what leaves the document without deleting anything, and reactivates it if it comes back (US4)', function () {
    importImageContent();
    $fixture = ContentFixture::fromImage();
    $gone = $fixture->unreferencedLabExercise();
    $before = ContentDatabase::counts();
    $oldHash = json_decode(DB::table('content_imports')->value('portion_hashes'), true)['lab.rust'];

    useContentAt($fixture->withoutExercise($gone)->write());
    $this->artisan('content:import')->expectsOutputToContain("Retirados: 1 ({$gone})")->assertExitCode(0);

    $row = DB::table('exercises')->where('id', $gone)->first();
    expect($row->status)->toBe('deprecated')
        ->and($row->retired_at)->not->toBeNull()
        ->and($row->position)->toBeNull()
        ->and(DB::table('exercise_tests')->where('exercise_id', $gone)->pluck('status')->unique()->all())->toBe(['deprecated'])
        ->and(DB::table('exercise_hints')->where('exercise_id', $gone)->pluck('status')->unique()->all())->toBe(['deprecated'])
        ->and(DB::table('content_imports')->count())->toBe(2)
        ->and(json_decode(DB::table('content_imports')->orderByDesc('id')->value('changes'), true)['retired'])->toBe([$gone])
        // Nothing was deleted: only this import's record was added.
        ->and(ContentDatabase::counts())->toBe(array_replace($before, ['content_imports' => 2]))
        // The portion changed: the cache keeps the new body and no longer the old one.
        ->and(app(BodyCache::class)->has(Portion::LabRust, $oldHash))->toBeFalse();

    useContentAt(ContentFixture::imagePath());
    $this->artisan('content:import')->expectsOutputToContain("Reactivados: 1 ({$gone})")->assertExitCode(0);

    $back = DB::table('exercises')->where('id', $gone)->first();
    expect($back->status)->toBe('active')->and($back->retired_at)->toBeNull()->and($back->position)->not->toBeNull()
        ->and(DB::table('exercise_tests')->where('exercise_id', $gone)->pluck('status')->unique()->all())->toBe(['active']);
});

it('--dry-run reports new, grading, text and retired, without writing', function () {
    $base = ContentFixture::fromImage();
    $added = $base->unreferencedLabExercise('rust');
    useContentAt($base->withoutExercise($added)->write());
    importContent();

    $next = ContentFixture::fromImage();
    $graded = $next->document->quests->go[0]->id;
    $next->exercise($graded)->tests[0]->expression .= ' && true';
    $texted = $next->document->quests->go[1]->id;
    $next->exercise($texted)->intro .= ' (revisado)';
    $retired = $next->unreferencedLabExercise('go');
    useContentAt($next->withoutExercise($retired)->write());
    $checksums = ContentDatabase::checksums();

    $writes = ContentDatabase::contentWritesDuring(function () use ($added, $graded, $texted, $retired) {
        $this->artisan('content:import', ['--dry-run' => true])
            ->expectsOutputToContain('no se escribió nada')
            ->expectsOutputToContain("Ejercicios nuevos: 1 ({$added})")
            ->expectsOutputToContain("Cambios de corrección: 1 ({$graded})")
            ->expectsOutputToContain("Cambios de texto: 1 ({$texted})")
            ->expectsOutputToContain("Retirados: 1 ({$retired})")
            ->assertExitCode(0);
    });

    expect($writes)->toBe([])->and(ContentDatabase::checksums())->toBe($checksums);
});

it('imports a change that differs only in case or accents, which MySQL would compare as equal', function () {
    importImageContent();
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->quests->go[0]->id;
    $original = $fixture->exercise($id)->title;
    $changed = mb_strtoupper($original);
    expect($changed)->not->toBe($original);
    $fixture->exercise($id)->title = $changed;
    useContentAt($fixture->write());

    $this->artisan('content:import')->expectsOutputToContain("Cambios de texto: 1 ({$id})")->assertExitCode(0);

    expect(DB::table('exercises')->where('id', $id)->value('title'))->toBe($changed);
});

it('rejects a meta from another build and writes nothing', function () {
    $directory = ContentFixture::fromImage()->write();
    file_put_contents("{$directory}/curriculum.json", file_get_contents("{$directory}/curriculum.json").' ');
    useContentAt($directory);

    $this->artisan('content:import')->expectsOutputToContain('no corresponde a este curriculum.json')->assertExitCode(1);

    expect(array_sum(ContentDatabase::counts()))->toBe(0);
});

it('a tampered hash in the meta fails the self-check and leaves nothing behind', function () {
    useContentAt(ContentFixture::fromImage()->write(editMeta: function (array $meta) {
        $meta['portions']['lab.rust'] = str_repeat('a', 64);

        return $meta;
    }));

    $this->artisan('content:import')
        ->expectsOutputToContain('La porción lab.rust armada desde las tablas no coincide con el hash de curriculum.meta.json')
        ->assertExitCode(1);

    expect(array_sum(ContentDatabase::counts()))->toBe(0)->and(importLockIsFree())->toBeTrue();
});

it('a database error halfway through leaves nothing half-done and releases the lock', function () {
    $fixture = ContentFixture::fromImage();
    // atlas_concepts.title is varchar(255): strict MySQL rejects it after the exercises and workshops are written.
    $fixture->document->atlas->go[count($fixture->document->atlas->go) - 1]->title = str_repeat('x', 300);
    useContentAt($fixture->write());

    expect(fn () => Artisan::call('content:import'))->toThrow(QueryException::class);

    expect(array_sum(ContentDatabase::counts()))->toBe(0)->and(importLockIsFree())->toBeTrue();
    importImageContent();
    expect(DB::table('exercises')->count())->toBe(274);
});

it('a lock wait timeout surfaces the MySQL error, which migrate retries on, and leaves nothing half-done', function () {
    importImageContent();
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->quests->go[0]->id;
    $fixture->exercise($id)->intro .= ' (revisado)';
    useContentAt($fixture->write());
    $checksums = ContentDatabase::checksums();
    $holder = DB::connectUsing('holder', config('database.connections.mysql'), true);
    $holder->beginTransaction();
    $holder->table('exercises')->where('id', $id)->lockForUpdate()->first();
    DB::statement('set session innodb_lock_wait_timeout = 1');

    $message = null;
    try {
        Artisan::call('content:import');
    } catch (QueryException $error) {
        $message = $error->getMessage();
    }
    $holder->rollBack();

    expect($message)->toContain('General error: 1205')
        ->and(ContentDatabase::checksums())->toBe($checksums)
        ->and(importLockIsFree())->toBeTrue();
    $this->artisan('content:import')->expectsOutputToContain('Importado el contenido')->assertExitCode(0);
});

it('only one import runs at a time: the second exits with an error instead of being skipped', function () {
    $holder = DB::connectUsing('holder', config('database.connections.mysql'), true);
    $name = DB::scalar("select concat(database(), ':content-import')");
    $holder->select('select get_lock(?, 0)', [$name]);

    $this->artisan('content:import')->expectsOutputToContain('Ya hay otro content:import en curso')->assertExitCode(1);
    expect(array_sum(ContentDatabase::counts()))->toBe(0);

    $holder->select('select release_lock(?)', [$name]);
    $this->artisan('content:import')->assertExitCode(0);
});

it('writes under READ COMMITTED', function () {
    $transaction = null;
    DB::listen(function ($query) use (&$transaction) {
        if (str_starts_with($query->sql, 'insert into `content_imports`')) {
            $transaction = DB::selectOne('select trx_isolation_level as isolation, trx_is_read_only as read_only from information_schema.innodb_trx where trx_mysql_thread_id = connection_id()');
        }
    });

    importContent();

    expect($transaction->isolation)->toBe('READ COMMITTED')->and($transaction->read_only)->toBe(0);
});

it('writes nothing when the connection that held the lock is lost before the transaction opens', function () {
    $reconnected = false;
    DB::listen(function ($query) use (&$reconnected) {
        if (! $reconnected && str_contains($query->sql, 'from `languages`')) {
            $reconnected = true;
            DB::purge();
        }
    });

    $this->artisan('content:import')->expectsOutputToContain('Se perdió el candado')->assertExitCode(1);

    expect(array_sum(ContentDatabase::counts()))->toBe(0);
});

it('records an import without touching the tables when only the document format changes', function () {
    importImageContent();
    $checksums = ContentDatabase::checksums();
    unset($checksums['content_imports']);
    $first = app(ContentImports::class)->latest();

    useContentAt(ContentFixture::fromImage()->write(indent: 4));
    $this->artisan('content:import')->assertExitCode(0);

    $second = app(ContentImports::class)->latest();
    $after = ContentDatabase::checksums();
    unset($after['content_imports']);
    expect($after)->toBe($checksums)
        ->and(DB::table('content_imports')->count())->toBe(2)
        ->and($second->portionHashes)->toBe($first->portionHashes)
        ->and($second->version())->not->toBe($first->version());
});

it('a different source commit with the same content records no import; with a commit, it stores it', function () {
    $commit = str_repeat('c', 40);
    useContentAt(ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => $commit] + $meta));
    importContent();
    expect(DB::table('content_imports')->value('source_commit'))->toBe($commit);

    useContentAt(ContentFixture::fromImage()->write(editMeta: fn (array $meta) => ['sourceCommit' => str_repeat('d', 40)] + $meta));
    $this->artisan('content:import')->assertExitCode(0);

    expect(DB::table('content_imports')->count())->toBe(1);
});

it('warns when the content carries no source commit', function () {
    $this->artisan('content:import')->expectsOutputToContain('no trae commit de origen')->assertExitCode(0);
});

it('every grading version that applied stays: A, B and A again add only one', function () {
    importImageContent();
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->quests->go[0]->id;
    $original = $fixture->exercise($id)->tests[0]->expression;
    $hashA = DB::table('exercises')->where('id', $id)->value('grading_hash');

    $fixture->exercise($id)->tests[0]->expression = $original.' && true';
    useContentAt($fixture->write());
    importContent();
    $hashB = DB::table('exercises')->where('id', $id)->value('grading_hash');

    importImageContent();

    expect($hashB)->not->toBe($hashA)
        ->and(DB::table('exercises')->where('id', $id)->value('grading_hash'))->toBe($hashA)
        ->and(DB::table('exercise_grading_versions')->where('exercise_id', $id)->pluck('grading_hash')->sort()->values()->all())
        ->toBe(collect([$hashA, $hashB])->sort()->values()->all())
        ->and(DB::table('exercise_grading_versions')->count())->toBe(275);
});

it('a test_key retired on its own is not reused, and the import leaves no trace', function () {
    importImageContent();
    $fixture = ContentFixture::fromImage();
    $id = $fixture->document->quests->go[0]->id;
    $exercise = $fixture->exercise($id);
    $removed = array_pop($exercise->tests);
    useContentAt($fixture->write());
    importContent();
    expect(DB::table('exercise_tests')->where('exercise_id', $id)->where('test_key', $removed->id)->value('status'))->toBe('deprecated');
    $checksums = ContentDatabase::checksums();

    useContentAt(ContentFixture::imagePath());
    Artisan::call('content:import');

    expect(Artisan::output())->toContain('el test_key se retiró y no se reutiliza')
        ->and(ContentDatabase::checksums())->toBe($checksums);
});

it('the rules between rows are checked with queries, and each one breaks by hand', function (string $sql, string $violation) {
    importImageContent();
    $invariants = new ContentInvariants;
    expect($invariants->violations())->toBe([]);

    DB::statement($sql);

    expect($invariants->violations())->toContain($violation);
})->with([
    'two bosses in a world' => [
        "update world_exercises set role = 'boss' where role = 'challenge' limit 1",
        'un mundo activo no tiene exactamente un jefe, último de sus desafíos',
    ],
    'an active exercise under a retired topic' => [
        "update topics set status = 'deprecated', retired_at = now(3), updated_at = now(3) limit 1",
        'hay filas activas de exercises que dependen de topics retirados',
    ],
    'the current grading without a version' => [
        "update exercises set grading_hash = repeat('f', 64) limit 1",
        'la corrección vigente de un ejercicio activo no está en exercise_grading_versions',
    ],
    'two exercises with the same position' => [
        "update exercises set position = 0 where catalog = 'lab' and language = 'rust' and position = 1",
        'hay filas activas de exercises con la misma posición',
    ],
    'a catalog chain that does not start at 1' => [
        "update catalogs set chain_position = 2 where code = 'lab'",
        'la cadena de catálogos no es única y contigua desde 1',
    ],
]);

it('each rule between rows detects its own violation', function () {
    importImageContent();
    $invariants = new ContentInvariants;
    $retire = fn (string $table, string $where = '1 = 1') => "update `{$table}` set `status` = 'deprecated', `retired_at` = now(3), `updated_at` = now(3)"
        .(Schema::hasColumn($table, 'position') ? ', `position` = null' : '')." where {$where}";

    $cases = [];
    foreach (['exercises', 'exercise_tests', 'workshops', 'workshop_objectives', 'workshop_steps', 'worlds', 'atlas_concepts', 'guide_resources', 'guide_modules', 'guide_steps', 'guide_step_resources'] as $table) {
        $cases["hay filas activas de {$table} con la misma posición"] = "update `{$table}` set `position` = 0 where `status` = 'active'";
    }
    $cases['hay filas activas de workshop_related_exercises con la misma posición en un lenguaje'] = "update `workshop_related_exercises` set `position` = 0 where `status` = 'active'";
    $cases['hay filas activas de world_exercises con la misma posición en un grupo de roles'] = "update `world_exercises` set `position` = 0 where `status` = 'active'";
    foreach ([
        'exercises' => ['topics', 'catalogs', 'workshops'],
        'exercise_tests' => ['exercises'],
        'exercise_hints' => ['exercises'],
        'workshop_objectives' => ['workshops'],
        'workshop_steps' => ['workshops'],
        'workshop_related_exercises' => ['workshops', 'exercises'],
        'world_exercises' => ['worlds', 'exercises'],
        'atlas_concepts' => ['exercises'],
        'guide_modules' => ['guide_tracks'],
        'guide_steps' => ['guide_modules'],
        'guide_step_resources' => ['guide_steps', 'guide_resources'],
    ] as $child => $parents) {
        foreach ($parents as $parent) {
            $cases["hay filas activas de {$child} que dependen de {$parent} retirados"] = $retire($parent);
        }
    }
    $cases['hay mundos activos sin jefe'] = $retire('world_exercises', "`role` = 'boss'");

    $undetected = [];
    foreach ($cases as $description => $sql) {
        DB::beginTransaction();
        DB::statement($sql);
        if (! in_array($description, $invariants->violations(), true)) {
            $undetected[] = $description;
        }
        DB::rollBack();
    }

    expect($undetected)->toBe([])->and($invariants->violations())->toBe([]);
});
