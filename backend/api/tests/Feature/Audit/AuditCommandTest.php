<?php

use App\Runs\Admission\ExerciseReader;
use App\Runs\Program\ProgramComposer;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Sleep;
use Tests\Support\AuditExecutorDouble;
use Tests\Support\AuditWorld;
use Tests\Support\ContentDatabase;

beforeEach(function () {
    $this->reports = sys_get_temp_dir().'/taller-audit-'.bin2hex(random_bytes(4));
    File::ensureDirectoryExists($this->reports);
    config(['audit.report_directory' => $this->reports, 'runs.executor.runtime' => 'runsc']);
    Sleep::fake();
});

afterEach(fn () => File::deleteDirectory($this->reports));

it('audits every active exercise twice and the sample, exits 0 and writes a record report (US1, FR-001, FR-017)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('Auditados 12 de 12 programas…')
        ->expectsOutputToContain('Programas: 12 · soluciones que aprueban: 4 de 4 · iniciales que fallan como corresponde: 4 de 4 · muestra de la prueba propia: 4 de 4')
        ->expectsOutputToContain('De registro: sí · veredicto: verde')
        ->assertExitCode(0);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    expect($report['run']['record'])->toBeTrue()
        ->and($report['run']['verdict'])->toBe('green')
        ->and($report['totals']['byLanguage'])->toBe(['rust' => ['exercises' => 2, 'programs' => 6], 'go' => ['exercises' => 2, 'programs' => 6]])
        ->and($report['totals']['bySection'])->toBe(['lab' => ['exercises' => 3], 'quests' => ['exercises' => 1]])
        ->and(file_exists("{$this->reports}/report.txt"))->toBeTrue();
});

it('decides each case of the table of the spec and exits as the spec says (SC-002)', function (string $marker, Closure $behavior, string $exercise, string $role, string $audit, ?string $finding, int $exitCode, string $line) {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept([$marker => $behavior()]));

    $this->artisan('curriculum:audit')->expectsOutputToContain($line)->assertExitCode($exitCode);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    $program = collect($report['programs'])->first(fn (array $entry) => $entry['exercise'] === $exercise && $entry['role'] === $role && $entry['customTest'] === null);
    expect($program['audit'])->toBe($audit)->and($program['finding'])->toBe($finding);
})->with([
    'a solution that fails a test' => ['solution_rust_01', fn () => AuditExecutorDouble::fails('t2'), 'rust-01', 'solution', 'finding', 'solution_not_passed', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · solución · failed · la solución de referencia no aprueba'],
    'a solution that does not compile' => ['solution_go_01', fn () => AuditExecutorDouble::compileError(), 'go-01', 'solution', 'finding', 'solution_not_passed', 1, 'HALLAZGO · go-01 (go, lab, completar) · solución · compile_error · la solución de referencia no aprueba'],
    'a starter that passes' => ['starter_rust_01', fn () => AuditExecutorDouble::passes(), 'rust-01', 'starter', 'finding', 'starter_passed', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · passed · las pruebas no detectan el código inicial'],
    'a complete starter that does not compile' => ['starter_go_01', fn () => AuditExecutorDouble::compileError(), 'go-01', 'starter', 'finding', 'starter_compile_error', 1, 'HALLAZGO · go-01 (go, lab, completar) · inicial · compile_error · el código inicial no compila y el ejercicio no es de reparar'],
    'a repair starter that does not compile' => ['starter_go_02', fn () => AuditExecutorDouble::compileError(), 'go-02', 'starter', 'fails_as_expected', null, 0, 'De registro: sí · veredicto: verde'],
    'an abort' => ['starter_rust_01', fn () => AuditExecutorDouble::exits(134), 'rust-01', 'starter', 'finding', 'starter_runtime_error', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · signal 6 · el código inicial terminó con un error antes de mostrar las pruebas'],
    'a timeout' => ['starter_rust_01', fn () => AuditExecutorDouble::timesOut(), 'rust-01', 'starter', 'finding', 'limit_exceeded', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · timeout · agotó un límite del sandbox'],
    'invalid evidence' => ['starter_rust_01', fn () => AuditExecutorDouble::exits(0), 'rust-01', 'starter', 'finding', 'starter_failed_without_tests', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · failed · evidence_invalid · el código inicial falló sin que las pruebas lo dijeran'],
    'output cut before the markers' => ['starter_rust_01', fn () => AuditExecutorDouble::cutsOutput(), 'rust-01', 'starter', 'finding', 'starter_failed_without_tests', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · failed · output_limit · el código inicial falló sin que las pruebas lo dijeran'],
    'the pids limit with runsc' => ['starter_rust_01', fn () => AuditExecutorDouble::exits(137), 'rust-01', 'starter', 'finding', 'limit_exceeded', 1, 'HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · pids_limit · agotó un límite del sandbox'],
    'a 500 of the executor' => ['solution_rust_01', fn () => AuditExecutorDouble::status(500), 'rust-01', 'solution', 'no_verdict', null, 1, 'SIN VEREDICTO · rust-01 (rust, lab, completar) · solución · el ejecutor no devolvió un resultado válido (status:500): es un problema del sandbox, no del contenido'],
]);

it('names the failing tests with key and label and the first lines of the diagnostic (US2, FR-018)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['solution_rust_01' => AuditExecutorDouble::fails('t2', "thread 'main' panicked at src/main.rs:3:5\n")]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('    pruebas: t2 «Prueba t2» fail')
        ->expectsOutputToContain('    diagnóstico:')
        ->expectsOutputToContain("      thread 'main' panicked at src/main.rs:3:5")
        ->assertExitCode(1);
});

it('runs only the chosen exercise as a partial run that is never a record run (FR-015)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit', ['--exercise' => ['rust-02']])
        ->expectsOutputToContain('De registro: no (corrida parcial) · veredicto: verde')
        ->assertExitCode(0);

    Http::assertSentCount(4);
});

it('is not a record run with runc, where a 137 is the signal 9 (FR-014)', function () {
    AuditWorld::curriculum();
    config(['runs.executor.runtime' => 'runc']);
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['starter_rust_01' => AuditExecutorDouble::exits(137)]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · signal 9 · el código inicial terminó con un error antes de mostrar las pruebas')
        ->expectsOutputToContain('De registro: no (runtime runc: con runc un 137 es la señal 9 y el --pids-limit no se confirma) · veredicto: rojo')
        ->assertExitCode(1);
});

it('reports the custom test apart and keeps the verdict passed (FR-034, SC-007)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit')->assertExitCode(0);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    $sample = collect($report['programs'])->filter(fn (array $entry) => $entry['customTest'] !== null)->values()->all();
    expect(collect($sample)->map(fn (array $entry) => [$entry['exercise'], $entry['status'], $entry['customTest']['outcome'], $entry['audit']])->all())->toBe([
        ['rust-01', 'passed', 'pass', 'passes'],
        ['rust-01', 'passed', 'fail', 'passes'],
        ['go-01', 'passed', 'pass', 'passes'],
        ['go-01', 'passed', 'fail', 'passes'],
    ]);
});

it('flags a custom test reported otherwise than the sample expects', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['energia(5) == 35' => AuditExecutorDouble::passes('FAIL')]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('HALLAZGO · rust-01 (rust, lab, completar) · solución · passed · la prueba propia no se informó como se esperaba')
        ->expectsOutputToContain('    prueba propia: esperada pass, informada fail')
        ->assertExitCode(1);
});

it('warns above half of a limit without failing (Q4, FR-022)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['solution_go_01' => AuditExecutorDouble::passes(compileMs: 7600)]));

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('AVISO · go-01 (go, lab, completar) · solución · compilar 7,60 s de 15,00 s (51 %)')
        ->expectsOutputToContain('Hallazgos: 0 · avisos: 1 · sin veredicto: 0')
        ->assertExitCode(0);
});

it('audits a program again after the executor was busy (FR-008)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::greenExcept(['solution_rust_01' => AuditExecutorDouble::busyThen(AuditExecutorDouble::passes())]));

    $this->artisan('curriculum:audit')->assertExitCode(0);

    Sleep::assertSequence([Sleep::for(2)->seconds()]);
});

it('sends the program B2 would build, with a fresh nonce for each one (US1)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());

    $this->artisan('curriculum:audit')->assertExitCode(0);

    $sent = [];
    foreach (Http::recorded() as [$request]) {
        if ($request->url() === AuditExecutorDouble::URL.'/v1/run' && ($request->data()['program'] ?? '') !== '') {
            $sent[] = $request->data()['program'];
        }
    }
    $nonces = collect($sent)->map(fn (string $program) => preg_match('/__TALLER_END__([0-9a-f]{32})/', $program, $match) === 1 ? $match[1] : '')->all();
    $solution = collect($sent)->first(fn (string $program) => str_contains($program, 'solution_go_01') && ! str_contains($program, 'Bytes(2)'));
    preg_match('/__TALLER_END__([0-9a-f]{32})/', (string) $solution, $match);
    $b2 = app(ProgramComposer::class)->compose(app(ExerciseReader::class)->forRun('go-01') ?? throw new LogicException('missing'), AuditWorld::code('go-01', 'solution'), null, $match[1]);

    expect($sent)->toHaveCount(12)
        ->and(array_unique($nonces))->toHaveCount(12)
        ->and($solution)->toBe($b2->text);
});

it('stamps the host values it receives and the content it audited (FR-020)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    $rust = 'sha256:'.str_repeat('1', 64);
    $go = 'sha256:'.str_repeat('2', 64);

    $this->artisan('curriculum:audit', [
        '--commit' => str_repeat('c', 40), '--clean-tree' => 'yes', '--rust-image' => $rust, '--go-image' => $go,
    ])->assertExitCode(0);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    expect($report['stamps'])->toBe([
        'commit' => str_repeat('c', 40),
        'cleanTree' => true,
        'contentSourceCommit' => null,
        'documentHash' => AuditWorld::imageDocumentHash(),
        'harnessHash' => AuditWorld::imageHarnessHash(),
        'images' => ['rust' => $rust, 'go' => $go],
    ])->and($report['run']['instance'])->toBe('auditoria')
        ->and($report['run']['concurrency'])->toBe(4);
});

it('writes nothing to the database and pushes no job (FR-012, SC-003)', function () {
    AuditWorld::curriculum();
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    Queue::fake();
    $tables = ['runs', 'attempts', 'attempt_tests', 'attempt_payloads', 'progress_heads', 'exercise_progress', 'jobs'];
    $count = fn () => [...collect($tables)->mapWithKeys(fn (string $table) => [$table => DB::table($table)->count()])->all(), ...ContentDatabase::counts()];
    $before = $count();

    $statements = ContentDatabase::queriesDuring(fn () => $this->artisan('curriculum:audit')->assertExitCode(0)->run());

    expect(collect($statements)->filter(fn (string $sql) => preg_match('/^\s*(insert|update|delete|replace|truncate)\b/i', $sql) === 1)->values()->all())->toBe([])
        ->and($count())->toBe($before);
    Queue::assertNothingPushed();
});

it('refuses to start, says why and runs nothing (FR-013)', function (string $situation, array $options, string $message) {
    AuditExecutorDouble::fake([]);
    if ($situation !== 'nothing imported') {
        AuditWorld::curriculum();
    }
    match ($situation) {
        'another build' => DB::table('content_imports')->update(['document_hash' => str_repeat('b', 64)]),
        'another harness' => DB::table('content_imports')->update(['portion_hashes' => json_encode(['harness' => str_repeat('d', 64)], JSON_THROW_ON_ERROR)]),
        'too much concurrency' => config(['audit.concurrency' => 9]),
        'no report directory' => config(['audit.report_directory' => $this->reports.'/missing']),
        'a rejected token' => config(['runs.executor.token' => str_repeat('x', 40)]),
        default => null,
    };

    $this->artisan('curriculum:audit', $options)->expectsOutputToContain($message)->assertExitCode(2);

    Http::assertNotSent(fn (Request $request) => ($request->data()['program'] ?? '') !== '');
    expect(file_exists("{$this->reports}/report.json"))->toBeFalse()
        ->and(DB::scalar("select is_free_lock(concat(database(), ':curriculum-audit'))"))->toBeIn([1, '1']);
})->with([
    'nothing imported' => ['nothing imported', [], 'No hay contenido importado'],
    'the import of another build' => ['another build', [], 'El contenido importado (bbbbbbbbbbbb) no es el de esta imagen'],
    'the import of another harness' => ['another harness', [], 'La plantilla importada (dddddddddddd) no es la de esta imagen'],
    'an unknown exercise' => ['ready', ['--exercise' => ['rust-99']], 'rust-99 no es un ejercicio activo de rust y go.'],
    'an unknown language' => ['ready', ['--language' => 'kotlin'], '--language admite rust o go y llegó «kotlin».'],
    'a short commit' => ['ready', ['--commit' => 'abc'], '--commit tiene que ser el hash completo de un commit y llegó «abc».'],
    'a concurrency out of range' => ['too much concurrency', [], 'AUDIT_CONCURRENCY tiene que estar entre 1 y 8 y es 9.'],
    'no report directory' => ['no report directory', [], 'No puedo escribir el informe en'],
    'a rejected token' => ['a rejected token', [], 'El ejecutor de auditoría rechazó el token (401)'],
]);

it('releases the lock after an unexpected failure while running programs', function () {
    AuditWorld::curriculum();
    Http::swap(Mockery::mock(Factory::class, [null])->makePartial());
    Http::shouldReceive('pool')->once()->andThrow(new RuntimeException('executor failed'));
    AuditExecutorDouble::fake([]);

    expect(fn () => $this->artisan('curriculum:audit')->run())->toThrow(RuntimeException::class, 'executor failed');
    expect(DB::scalar("select is_free_lock(concat(database(), ':curriculum-audit'))"))->toBeIn([1, '1']);
});

it('keeps another connection lock when acquisition is refused', function () {
    config(['database.connections.audit_holder' => config('database.connections.mysql')]);
    $holder = DB::connection('audit_holder');
    $holder->scalar("select get_lock(concat(database(), ':curriculum-audit'), 0)");
    AuditExecutorDouble::fake([]);

    try {
        $this->artisan('curriculum:audit')->expectsOutputToContain('Ya hay otra corrida de auditoría en curso')->assertExitCode(2);
        expect($holder->scalar("select is_used_lock(concat(database(), ':curriculum-audit'))"))
            ->toBe($holder->scalar('select connection_id()'));
        Http::assertNothingSent();
    } finally {
        $holder->scalar("select release_lock(concat(database(), ':curriculum-audit'))");
        DB::purge('audit_holder');
    }
});

it('forwards concurrency to the pool and bounds batches to its configured capacity', function () {
    AuditWorld::curriculum();
    config(['audit.concurrency' => 1, 'audit.batch_per_slot' => 2]);
    AuditExecutorDouble::fake(AuditExecutorDouble::green());
    $factory = Http::getFacadeRoot();
    Http::swap(Mockery::mock($factory));
    $forwarded = [];
    Http::shouldReceive('pool')->times(6)->andReturnUsing(function (callable $callback, int $concurrency) use ($factory, &$forwarded) {
        $forwarded[] = $concurrency;

        return $factory->pool($callback, concurrency: $concurrency);
    });

    $this->artisan('curriculum:audit')
        ->expectsOutputToContain('Auditados 2 de 12 programas…')
        ->expectsOutputToContain('Auditados 4 de 12 programas…')
        ->expectsOutputToContain('Auditados 12 de 12 programas…')
        ->assertExitCode(0);

    $report = json_decode((string) file_get_contents("{$this->reports}/report.json"), true, 512, JSON_THROW_ON_ERROR);
    expect($report['run']['concurrency'])->toBe(1)->and($forwarded)->toBe([1, 1, 1, 1, 1, 1]);
});
