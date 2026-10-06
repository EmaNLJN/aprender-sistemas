<?php

use App\Content\InvalidPortionRequest;
use App\Content\Portion;
use Illuminate\Support\Arr;

it('has 18 portions, in the order the generator publishes them', function () {
    expect(Arr::pluck(Portion::cases(), 'value'))->toBe([
        'lab.rust', 'lab.go', 'quests.rust', 'quests.go',
        'cores.lowlevel', 'cores.infra', 'cores.play', 'cores.pc',
        'campaign.rust', 'campaign.go',
        'workshops.lowlevel', 'workshops.infra', 'workshops.play', 'workshops.pc',
        'atlas.rust', 'atlas.go', 'guide', 'harness',
    ]);
});

// The expected values come from the spec's table of the 18 portions (Key Entities), not from the enum.
it('gives each portion its group, what slices it and whether it holds exercises', function (Portion $portion, string $group, ?string $slice, bool $isExercises) {
    expect($portion->group())->toBe($group)
        ->and($portion->slice())->toBe($slice)
        ->and($portion->isExercises())->toBe($isExercises);
})->with([
    'Rust lab' => [Portion::LabRust, 'lab', 'rust', true],
    'Go quests' => [Portion::QuestsGo, 'quests', 'go', true],
    'PC cores' => [Portion::CoresPc, 'cores', 'pc', true],
    'Go campaign' => [Portion::CampaignGo, 'campaign', 'go', false],
    'infrastructure workshops' => [Portion::WorkshopsInfra, 'workshops', 'infra', false],
    'Rust atlas' => [Portion::AtlasRust, 'atlas', 'rust', false],
    'the guide is not sliced' => [Portion::Guide, 'guide', null, false],
    'the harness is not sliced' => [Portion::Harness, 'harness', null, false],
]);

it('slices each group by language, by domain or by nothing', function (string $group, ?string $parameter) {
    expect(Portion::sliceBy($group))->toBe($parameter);
})->with([
    'lab' => ['lab', 'language'],
    'quests' => ['quests', 'language'],
    'campaign' => ['campaign', 'language'],
    'atlas' => ['atlas', 'language'],
    'cores' => ['cores', 'domain'],
    'workshops' => ['workshops', 'domain'],
    'guide' => ['guide', null],
    'harness' => ['harness', null],
]);

it('resolves each resource by its parameter', function (string $resource, array $query, Portion $expected) {
    expect(Portion::resolve($resource, $query))->toBe($expected);
})->with([
    'lab exercises' => ['exercises', ['catalog' => 'lab', 'language' => 'rust'], Portion::LabRust],
    'quests exercises' => ['exercises', ['catalog' => 'quests', 'language' => 'go'], Portion::QuestsGo],
    'cores by domain' => ['exercises', ['catalog' => 'cores', 'domain' => 'infra'], Portion::CoresInfra],
    'worlds' => ['worlds', ['language' => 'go'], Portion::CampaignGo],
    'workshops' => ['workshops', ['domain' => 'pc'], Portion::WorkshopsPc],
    'atlas' => ['atlas', ['language' => 'rust'], Portion::AtlasRust],
    'guide' => ['guide', [], Portion::Guide],
    'the guide ignores extra parameters' => ['guide', ['language' => 'rust'], Portion::Guide],
    'the harness' => ['harness', [], Portion::Harness],
    'the harness ignores extra parameters' => ['harness', ['language' => 'rust', 'domain' => 'pc'], Portion::Harness],
]);

it('responds with one message per parameter when the request matches no portion', function (string $resource, array $query, array $parameters) {
    try {
        Portion::resolve($resource, $query);
        $this->fail('InvalidPortionRequest expected');
    } catch (InvalidPortionRequest $error) {
        expect(array_keys($error->errors))->toBe($parameters);
    }
})->with([
    'no catalog' => ['exercises', [], ['catalog']],
    'unknown catalog' => ['exercises', ['catalog' => 'esenciales', 'language' => 'rust'], ['catalog']],
    'lab without language' => ['exercises', ['catalog' => 'lab'], ['language']],
    'lab with domain instead of language' => ['exercises', ['catalog' => 'lab', 'domain' => 'pc'], ['language', 'domain']],
    'lab with both' => ['exercises', ['catalog' => 'lab', 'language' => 'rust', 'domain' => 'pc'], ['domain']],
    'cores with language' => ['exercises', ['catalog' => 'cores', 'language' => 'rust'], ['language', 'domain']],
    'unknown language' => ['worlds', ['language' => 'cobol'], ['language']],
    'empty language' => ['atlas', ['language' => ''], ['language']],
    'language as a list' => ['atlas', ['language' => ['rust']], ['language']],
    'language with different capitalization' => ['atlas', ['language' => 'Rust'], ['language']],
    'unknown domain' => ['workshops', ['domain' => 'cloud'], ['domain']],
    'workshops with language' => ['workshops', ['domain' => 'pc', 'language' => 'rust'], ['language']],
]);

it('explains in Spanish which parameter is missing, which is extra and which is invalid', function (string $resource, array $query, array $errors) {
    try {
        Portion::resolve($resource, $query);
        $this->fail('InvalidPortionRequest expected');
    } catch (InvalidPortionRequest $error) {
        expect($error->errors)->toBe($errors);
    }
})->with([
    'missing catalog' => ['exercises', [], ['catalog' => ['Falta el catálogo o no es válido: usá lab, quests o cores.']]],
    'missing language' => ['atlas', [], ['language' => ['Falta el parámetro language: usá rust o go.']]],
    'extra domain' => ['worlds', ['language' => 'go', 'domain' => 'pc'], ['domain' => ['Sobra el parámetro domain: este recurso se corta por language.']]],
    'invalid domain' => ['workshops', ['domain' => 'cloud'], ['domain' => ['El valor de domain no es válido: usá lowlevel, infra, play o pc.']]],
]);

// An unknown resource is a caller bug, not a client error: it is not an InvalidPortionRequest (422).
it('rejects an unknown resource as a programming error', function () {
    Portion::resolve('courses', []);
})->throws(InvalidArgumentException::class, 'Recurso de contenido desconocido: courses');
