<?php

use App\Audit\AuditRefused;
use App\Audit\AuditReportText;
use App\Audit\HostStamps;
use App\Audit\ProgramJudge;
use App\Audit\ProgramRole;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Evidence\Verdict;
use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;
use App\Runs\RunReason;
use App\Runs\RunStatus;
use App\Runs\TestOutcome;
use Tests\Support\AuditCases;

it('writes exactly the hand-written example for the same run (FR-019, FR-020, FR-035)', function () {
    $example = json_decode((string) file_get_contents(dirname(__DIR__, 2).'/Fixtures/shared/audit-report-example.json'), true, 512, JSON_THROW_ON_ERROR);

    expect(json_decode(AuditCases::exampleReport()->json(), true, 512, JSON_THROW_ON_ERROR))->toBe($example);
});

it('writes the example as legible lines in Spanish (FR-018, FR-022, FR-026)', function () {
    $report = AuditCases::exampleReport();

    expect((new AuditReportText($report, AuditCases::limits()))->lines())->toBe([
        'HALLAZGO · rust-63 (rust, lab, completar) · inicial · compile_error · el código inicial no compila y el ejercicio no es de reparar',
        '    diagnóstico:',
        "      error[E0277]: can't compare `!` with `i32`",
        '       --> /tmp/main.rs:12:57',
        'AVISO · rust-63 (rust, lab, completar) · solución · compilar 11,00 s de 20,00 s (55 %)',
        '',
        'Auditoría del currículo · parcial · runtime runsc · instancia auditoria · 4 programas simultáneos',
        'Inicio 2026-11-02 03:00:00 UTC · fin 03:00:09 UTC · 9 s',
        'Programas: 6 · soluciones que aprueban: 2 de 2 · iniciales que fallan como corresponde: 1 de 2 · muestra de la prueba propia: 2 de 2',
        'Hallazgos: 1 · avisos: 1 · sin veredicto: 0',
        'Tiempos (incluyen el arranque del contenedor):',
        '  rust compilar: mediana 0,81 s · máximo 11,00 s · margen mínimo 9,00 s de 20,00 s',
        '  rust ejecutar: mediana 0,03 s · máximo 0,04 s · margen mínimo 9,96 s de 10,00 s',
        'Por lenguaje: rust 2 ejercicios · por sección: lab 2',
        'De registro: no (corrida parcial) · veredicto: rojo',
    ]);
});

it('is a record run only when it is complete, with runsc and with a verdict for every program (FR-014, FR-017)', function (array $languages, string $runtime, bool $noVerdict, bool $record) {
    $report = AuditCases::reportOf($languages, $runtime, $noVerdict);

    expect($report->isRecord())->toBe($record);
})->with([
    'complete with runsc' => [[RunLanguage::Rust, RunLanguage::Go], 'runsc', false, true],
    'complete with runc' => [[RunLanguage::Rust, RunLanguage::Go], 'runc', false, false],
    'one language' => [[RunLanguage::Go], 'runsc', false, false],
    'a program without a verdict' => [[RunLanguage::Rust, RunLanguage::Go], 'runsc', true, false],
]);

it('exits 0 only without findings and without programs without a verdict (FR-017)', function () {
    expect(AuditCases::reportOf([RunLanguage::Rust, RunLanguage::Go], 'runsc', false)->exitCode())->toBe(0)
        ->and(AuditCases::reportOf([RunLanguage::Rust, RunLanguage::Go], 'runsc', true)->exitCode())->toBe(1)
        ->and(AuditCases::exampleReport()->exitCode())->toBe(1);
});

it('says why a run is not a record run, and lists a program without a verdict apart', function () {
    $lines = (new AuditReportText(AuditCases::reportOf([RunLanguage::Rust, RunLanguage::Go], 'runc', true), AuditCases::limits()))->lines();

    expect($lines)->toContain('SIN VEREDICTO · rust-01 (rust, lab, completar) · solución · el ejecutor no devolvió un resultado válido (status:500): es un problema del sandbox, no del contenido')
        ->and($lines[array_key_last($lines)])->toBe('De registro: no (runtime runc: con runc un 137 es la señal 9 y el --pids-limit no se confirma; hay programas sin veredicto) · veredicto: rojo');
});

it('names the failing tests with key and label, keeps a key of digits as text, and gives the signal of an abort', function () {
    $judge = new ProgramJudge(AuditCases::limits());
    $failed = $judge->judge(AuditCases::program(), AuditCases::result(), AuditCases::verdict(RunStatus::Failed, outcomes: [TestOutcome::Pass, TestOutcome::Fail]));
    $aborted = $judge->judge(AuditCases::program(ProgramRole::Starter), AuditCases::result(), AuditCases::verdict(RunStatus::RuntimeError, RunReason::Signal, exitCode: 134));
    $digits = $judge->judge(AuditCases::program(), AuditCases::result(), new Verdict(RunStatus::Failed, null, ExecutorPhase::Run, 0, false, 900, 200, '', '', [new TestVerdict('123', TestOutcome::Fail)], null));
    $report = AuditCases::reportWith([$failed, $aborted, $digits]);
    $lines = (new AuditReportText($report, AuditCases::limits()))->lines();
    $json = json_decode($report->json(), true, 512, JSON_THROW_ON_ERROR);

    expect($lines)->toContain('HALLAZGO · rust-01 (rust, lab, completar) · solución · failed · la solución de referencia no aprueba')
        ->and($lines)->toContain('    pruebas: t2 «Segunda» fail')
        ->and($lines)->toContain('HALLAZGO · rust-01 (rust, lab, completar) · inicial · runtime_error · signal 6 · el código inicial terminó con un error antes de mostrar las pruebas')
        ->and($lines)->toContain('    pruebas: 123 «» fail')
        ->and($json['programs'][2]['tests'][0]['key'])->toBe('123');
});

it('rejects host stamps that are not a commit, yes or no, or an image id (FR-020)', function (array $options, string $message) {
    expect(fn () => HostStamps::fromOptions(...$options))->toThrow(AuditRefused::class, $message);
})->with([
    'a short commit' => [['dd870a9c', null, null, null], '--commit tiene que ser el hash completo de un commit y llegó «dd870a9c».'],
    'a clean tree that is not yes or no' => [[null, 'si', null, null], '--clean-tree admite yes o no y llegó «si».'],
    'an image tag' => [[null, null, 'taller-sandbox-rust:local', null], '--rust-image tiene que ser «sha256:» y 64 hexadecimales y llegó «taller-sandbox-rust:local».'],
]);
