<?php

use App\Audit\AuditLimits;
use App\Audit\FindingKind;
use App\Audit\PhaseTiming;
use App\Audit\ProgramRole;
use App\Runs\ExecutorPhase;
use App\Runs\RunLanguage;

it('says each finding in Spanish', function (FindingKind $kind, string $message) {
    expect($kind->message())->toBe($message);
})->with([
    [FindingKind::SolutionNotPassed, 'la solución de referencia no aprueba'],
    [FindingKind::StarterPassed, 'las pruebas no detectan el código inicial'],
    [FindingKind::StarterFailedWithoutTests, 'el código inicial falló sin que las pruebas lo dijeran'],
    [FindingKind::StarterCompileError, 'el código inicial no compila y el ejercicio no es de reparar'],
    [FindingKind::StarterRuntimeError, 'el código inicial terminó con un error antes de mostrar las pruebas'],
    [FindingKind::LimitExceeded, 'agotó un límite del sandbox'],
    [FindingKind::CustomTestMismatch, 'la prueba propia no se informó como se esperaba'],
]);

it('names the program role in Spanish', function () {
    expect(ProgramRole::Solution->label())->toBe('solución')
        ->and(ProgramRole::Starter->label())->toBe('inicial');
});

it('measures a phase against its limit with the margin and the ratio', function () {
    $timing = new PhaseTiming(812, 20000);

    expect($timing->marginMs())->toBe(19188)
        ->and($timing->ratio())->toBe(0.041);
});

it('warns only above half of a limit (Q4)', function (int $ms, int $limitMs, bool $near) {
    $limits = new AuditLimits(20000, 15000, 10000, 1024, 256, 0.5);

    expect($limits->isNear(new PhaseTiming($ms, $limitMs)))->toBe($near);
})->with([
    'just above half of the Rust compile limit' => [10001, 20000, true],
    'exactly half' => [10000, 20000, false],
    'above half of the Go compile limit' => [7600, 15000, true],
    'above half of the run limit' => [5001, 10000, true],
    'far from the limit' => [900, 20000, false],
]);

it('picks the compile limit by language and the memory by phase', function () {
    $limits = new AuditLimits(20000, 15000, 10000, 1024, 256, 0.5);

    expect($limits->compileMs(RunLanguage::Rust))->toBe(20000)
        ->and($limits->compileMs(RunLanguage::Go))->toBe(15000)
        ->and($limits->memoryMiB(ExecutorPhase::Compile))->toBe(1024)
        ->and($limits->memoryMiB(ExecutorPhase::Run))->toBe(256);
});
