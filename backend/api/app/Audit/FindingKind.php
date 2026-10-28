<?php

namespace App\Audit;

enum FindingKind: string
{
    case SolutionNotPassed = 'solution_not_passed';
    case StarterPassed = 'starter_passed';
    case StarterFailedWithoutTests = 'starter_failed_without_tests';
    case StarterCompileError = 'starter_compile_error';
    case StarterRuntimeError = 'starter_runtime_error';
    case LimitExceeded = 'limit_exceeded';
    case CustomTestMismatch = 'custom_test_mismatch';

    public function message(): string
    {
        return match ($this) {
            self::SolutionNotPassed => 'la solución de referencia no aprueba',
            self::StarterPassed => 'las pruebas no detectan el código inicial',
            self::StarterFailedWithoutTests => 'el código inicial falló sin que las pruebas lo dijeran',
            self::StarterCompileError => 'el código inicial no compila y el ejercicio no es de reparar',
            self::StarterRuntimeError => 'el código inicial terminó con un error antes de mostrar las pruebas',
            self::LimitExceeded => 'agotó un límite del sandbox',
            self::CustomTestMismatch => 'la prueba propia no se informó como se esperaba',
        };
    }
}
