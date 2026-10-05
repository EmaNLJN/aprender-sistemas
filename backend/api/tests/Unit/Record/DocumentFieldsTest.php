<?php

use App\Content\InvalidContent;
use App\Content\Record\DocumentFields;

$record = (object) ['title' => 'T', 'stage' => 1, 'featured' => true, 'quiz' => null];
$path = 'lab.rust[0]';
$known = ['title', 'stage', 'featured', 'quiz'];

it('rejects an unknown key before reading any field', function () use ($record, $path) {
    $badRecord = (object) ['title' => 'T', 'extra' => 'x'];
    expect(fn () => DocumentFields::of($badRecord, $path, ['title']))
        ->toThrow(InvalidContent::class, 'clave desconocida');
});

it('reads a required text field', function () use ($record, $path, $known) {
    $fields = DocumentFields::of($record, $path, $known);
    expect($fields->text('title'))->toBe('T');
});

it('rejects a missing required field', function () use ($record, $path, $known) {
    $fields = DocumentFields::of($record, $path, $known);
    expect(fn () => $fields->text('missing'))
        ->toThrow(InvalidContent::class, 'falta la clave «missing»');
});

it('rejects empty text', function () use ($record, $path, $known) {
    $fields = DocumentFields::of($record, $path, $known);
    expect(fn () => $fields->text('empty'))
        ->toThrow(InvalidContent::class, 'falta la clave «empty»');

    $badRecord = (object) ['title' => ''];
    $fields = DocumentFields::of($badRecord, $path, ['title']);
    expect(fn () => $fields->text('title'))
        ->toThrow(InvalidContent::class, 'se esperaba un texto no vacío');
});

it('rejects a non-integer where an integer is expected', function () use ($record, $path) {
    $badRecord = (object) ['stage' => '1'];
    $fields = DocumentFields::of($badRecord, $path, ['stage']);
    expect(fn () => $fields->number('stage'))
        ->toThrow(InvalidContent::class, 'se esperaba un entero');
});

it('rejects a non-boolean where a boolean is expected', function () use ($record, $path) {
    $badRecord = (object) ['featured' => 'yes'];
    $fields = DocumentFields::of($badRecord, $path, ['featured']);
    expect(fn () => $fields->flag('featured'))
        ->toThrow(InvalidContent::class, 'se esperaba true o false');
});

it('reads an optional text field', function () use ($record, $path, $known) {
    $fields = DocumentFields::of($record, $path, $known);
    expect($fields->optionalText('missing'))->toBeNull();
    expect($fields->optionalText('title'))->toBe('T');
});

it('reads a JSON value', function () use ($record, $path, $known) {
    $fields = DocumentFields::of($record, $path, $known);
    $json = $fields->json('quiz');
    expect($json->toPublished())->toBeNull();
});

it('reads an optional JSON value', function () use ($record, $path, $known) {
    $fields = DocumentFields::of($record, $path, $known);
    expect($fields->optionalJson('missing'))->toBeNull();
    expect($fields->optionalJson('quiz'))->not->toBeNull();
});

it('reads the key order', function () use ($record, $path, $known) {
    $fields = DocumentFields::of($record, $path, $known);
    expect($fields->keyOrder()->keys)->toBe(['title', 'stage', 'featured', 'quiz']);
});
