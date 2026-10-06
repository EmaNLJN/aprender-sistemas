<?php

namespace App\Runs\Evidence;

use App\Runs\TestOutcome;

/** Una lista de estos y no un arreglo por clave: PHP convierte en entero una clave de arreglo como '123', y una clave de prueba puede ser así. */
final readonly class TestVerdict
{
    public function __construct(public string $key, public TestOutcome $outcome) {}
}
