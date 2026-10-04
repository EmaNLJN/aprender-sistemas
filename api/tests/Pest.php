<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Las pruebas de tests/Feature arrancan la aplicación (Tests\TestCase) y corren dentro de una
// transacción que RefreshDatabase revierte. El código que hace TRUNCATE o abre sus propias
// transacciones, como content:import en C2, usa DatabaseTruncation: bajo RefreshDatabase sus
// commits implícitos filtrarían datos entre pruebas.
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');
