<?php

use Illuminate\Foundation\Testing\DatabaseTruncation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Las pruebas de tests/Feature arrancan la aplicación (Tests\TestCase) y corren dentro de una
// transacción que RefreshDatabase revierte.
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

// content:import abre y confirma su propia transacción, y las pruebas de DDL confirman las suyas:
// estas pruebas vacían las tablas antes de cada una (DatabaseTruncation, ADR 0004) en lugar de
// envolverse en una transacción, para que el import corra como en producción y el rollback de un
// error se pueda verificar. Un DDL confirma la transacción: bajo RefreshDatabase filtraría datos.
pest()->extend(TestCase::class)
    ->use(DatabaseTruncation::class)
    ->in('Content');

// tests/Unit no arranca la aplicación: son clases de PHP puro (codificador, códecs, diferencia).
