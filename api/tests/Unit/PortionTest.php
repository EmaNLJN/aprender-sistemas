<?php

use App\Content\InvalidPortionRequest;
use App\Content\Portion;

it('son 17 porciones, en el orden en que las publica el generador', function () {
    expect(array_map(fn (Portion $portion) => $portion->value, Portion::cases()))->toBe([
        'lab.rust', 'lab.go', 'quests.rust', 'quests.go',
        'cores.lowlevel', 'cores.infra', 'cores.play', 'cores.pc',
        'campaign.rust', 'campaign.go',
        'workshops.lowlevel', 'workshops.infra', 'workshops.play', 'workshops.pc',
        'atlas.rust', 'atlas.go', 'guide',
    ]);
});

// Los esperados salen de la tabla de las 17 porciones de la spec (Key Entities), no del enum.
it('cada porción sabe su grupo, lo que la corta y si es de ejercicios', function (Portion $portion, string $group, ?string $slice, bool $isExercises) {
    expect($portion->group())->toBe($group)
        ->and($portion->slice())->toBe($slice)
        ->and($portion->isExercises())->toBe($isExercises);
})->with([
    'recorrido de Rust' => [Portion::LabRust, 'lab', 'rust', true],
    'desafíos de Go' => [Portion::QuestsGo, 'quests', 'go', true],
    'núcleos de PC' => [Portion::CoresPc, 'cores', 'pc', true],
    'campaña de Go' => [Portion::CampaignGo, 'campaign', 'go', false],
    'talleres de infraestructura' => [Portion::WorkshopsInfra, 'workshops', 'infra', false],
    'Atlas de Rust' => [Portion::AtlasRust, 'atlas', 'rust', false],
    'la guía no se corta' => [Portion::Guide, 'guide', null, false],
]);

it('cada grupo se corta por language, por domain o por nada', function (string $group, ?string $parameter) {
    expect(Portion::sliceBy($group))->toBe($parameter);
})->with([
    'lab' => ['lab', 'language'],
    'quests' => ['quests', 'language'],
    'campaign' => ['campaign', 'language'],
    'atlas' => ['atlas', 'language'],
    'cores' => ['cores', 'domain'],
    'workshops' => ['workshops', 'domain'],
    'guide' => ['guide', null],
]);

it('resuelve cada recurso por su parámetro', function (string $resource, array $query, Portion $expected) {
    expect(Portion::resolve($resource, $query))->toBe($expected);
})->with([
    'ejercicios del recorrido' => ['exercises', ['catalog' => 'lab', 'language' => 'rust'], Portion::LabRust],
    'ejercicios de desafíos' => ['exercises', ['catalog' => 'quests', 'language' => 'go'], Portion::QuestsGo],
    'núcleos por dominio' => ['exercises', ['catalog' => 'cores', 'domain' => 'infra'], Portion::CoresInfra],
    'mundos' => ['worlds', ['language' => 'go'], Portion::CampaignGo],
    'talleres' => ['workshops', ['domain' => 'pc'], Portion::WorkshopsPc],
    'atlas' => ['atlas', ['language' => 'rust'], Portion::AtlasRust],
    'guía' => ['guide', [], Portion::Guide],
    'la guía ignora lo que sobre' => ['guide', ['language' => 'rust'], Portion::Guide],
]);

it('responde con un mensaje por parámetro cuando el pedido no corresponde a una porción', function (string $resource, array $query, array $parameters) {
    try {
        Portion::resolve($resource, $query);
        $this->fail('se esperaba InvalidPortionRequest');
    } catch (InvalidPortionRequest $error) {
        expect(array_keys($error->errors))->toBe($parameters);
    }
})->with([
    'sin catálogo' => ['exercises', [], ['catalog']],
    'catálogo desconocido' => ['exercises', ['catalog' => 'esenciales', 'language' => 'rust'], ['catalog']],
    'lab sin lenguaje' => ['exercises', ['catalog' => 'lab'], ['language']],
    'lab con dominio en lugar de lenguaje' => ['exercises', ['catalog' => 'lab', 'domain' => 'pc'], ['language', 'domain']],
    'lab con los dos' => ['exercises', ['catalog' => 'lab', 'language' => 'rust', 'domain' => 'pc'], ['domain']],
    'cores con lenguaje' => ['exercises', ['catalog' => 'cores', 'language' => 'rust'], ['language', 'domain']],
    'lenguaje desconocido' => ['worlds', ['language' => 'cobol'], ['language']],
    'lenguaje vacío' => ['atlas', ['language' => ''], ['language']],
    'lenguaje como lista' => ['atlas', ['language' => ['rust']], ['language']],
    'lenguaje con otras mayúsculas' => ['atlas', ['language' => 'Rust'], ['language']],
    'dominio desconocido' => ['workshops', ['domain' => 'cloud'], ['domain']],
    'talleres con lenguaje' => ['workshops', ['domain' => 'pc', 'language' => 'rust'], ['language']],
]);

// Cada mensaje es una lista con un texto en español que dice qué pasa: el controlador los publica
// tal cual en el 422.
it('explica en español qué parámetro falta, cuál sobra y cuál no vale', function (string $resource, array $query, array $errors) {
    try {
        Portion::resolve($resource, $query);
        $this->fail('se esperaba InvalidPortionRequest');
    } catch (InvalidPortionRequest $error) {
        expect($error->errors)->toBe($errors);
    }
})->with([
    'falta el catálogo' => ['exercises', [], ['catalog' => ['Falta el catálogo o no es válido: usá lab, quests o cores.']]],
    'falta el lenguaje' => ['atlas', [], ['language' => ['Falta el parámetro language: usá rust o go.']]],
    'sobra el dominio' => ['worlds', ['language' => 'go', 'domain' => 'pc'], ['domain' => ['Sobra el parámetro domain: este recurso se corta por language.']]],
    'el dominio no vale' => ['workshops', ['domain' => 'cloud'], ['domain' => ['El valor de domain no es válido: usá lowlevel, infra, play o pc.']]],
]);

// Los recursos son rutas fijas del programa: uno desconocido es un descuido de quien llama, no un
// pedido inválido del cliente, así que no es un InvalidPortionRequest (422).
it('rechaza como error de programación un recurso que no existe', function () {
    Portion::resolve('cursos', []);
})->throws(InvalidArgumentException::class, 'Recurso de contenido desconocido: cursos');
