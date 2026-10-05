<?php

use App\Content\Record\RowFields;

it('reads an integer from a row', function () {
    $row = ['id' => 7];
    $fields = new RowFields($row, 'test_table');
    expect($fields->int('id'))->toBe(7);
});

it('accepts an integer as text', function () {
    $row = ['id' => '7'];
    $fields = new RowFields($row, 'test_table');
    expect($fields->int('id'))->toBe(7);
});

it('accepts a negative integer as text', function () {
    $row = ['id' => '-3'];
    $fields = new RowFields($row, 'test_table');
    expect($fields->int('id'))->toBe(-3);
});

it('rejects a non-integer string', function () {
    $row = ['id' => '7.5'];
    $fields = new RowFields($row, 'test_table');
    expect(fn () => $fields->int('id'))
        ->toThrow(LogicException::class);
});

it('rejects null for a required integer', function () {
    $row = ['id' => null];
    $fields = new RowFields($row, 'test_table');
    expect(fn () => $fields->int('id'))
        ->toThrow(LogicException::class);
});

it('rejects a boolean for an integer', function () {
    $row = ['id' => true];
    $fields = new RowFields($row, 'test_table');
    expect(fn () => $fields->int('id'))
        ->toThrow(LogicException::class);
});

it('reads a flag', function () {
    expect((new RowFields(['flag' => 0], 'test'))->flag('flag'))->toBeFalse();
    expect((new RowFields(['flag' => 1], 'test'))->flag('flag'))->toBeTrue();
    expect((new RowFields(['flag' => '0'], 'test'))->flag('flag'))->toBeFalse();
    expect((new RowFields(['flag' => '1'], 'test'))->flag('flag'))->toBeTrue();
});

it('rejects an invalid flag value', function () {
    $row = ['flag' => 2];
    $fields = new RowFields($row, 'test_table');
    expect(fn () => $fields->flag('flag'))
        ->toThrow(LogicException::class);
});

it('reads a string', function () {
    $row = ['text' => 'hello'];
    $fields = new RowFields($row, 'test_table');
    expect($fields->string('text'))->toBe('hello');
});

it('rejects a non-string', function () {
    $row = ['text' => 7];
    $fields = new RowFields($row, 'test_table');
    expect(fn () => $fields->string('text'))
        ->toThrow(LogicException::class);
});

it('reads a nullable string', function () {
    expect((new RowFields(['text' => 'hello'], 'test'))->nullableString('text'))->toBe('hello');
    expect((new RowFields(['text' => null], 'test'))->nullableString('text'))->toBeNull();
});

it('reads a nullable integer', function () {
    expect((new RowFields(['id' => 7], 'test'))->nullableInt('id'))->toBe(7);
    expect((new RowFields(['id' => null], 'test'))->nullableInt('id'))->toBeNull();
});

it('fails if a column is missing from the row', function () {
    $row = ['id' => 1];
    $fields = new RowFields($row, 'test_table');
    expect(fn () => $fields->string('missing'))
        ->toThrow(LogicException::class, 'test_table: a la fila le falta la columna missing');
});
