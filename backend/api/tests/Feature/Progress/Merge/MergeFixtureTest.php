<?php

use App\Progress\Merge\OperationWriter;
use App\Progress\Operations\FieldKinds;
use App\Progress\Operations\OperationType;
use App\Progress\Operations\RouteMilestones;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\MergeKinds;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;

const STORED_REVISION = 5;
const TRANSACTION_REVISION = 6;

it('is a frozen fixture', function () {
    expect(MergeFixture::actualHash())->toBe(MergeFixture::frozenHash(), 'es un fixture congelado');
});

it('has exactly the field kinds of the registry, with the same rule', function () {
    $fixtureRules = array_map(fn (array $kind) => $kind['rule'], MergeFixture::kinds());
    $registryRules = array_map(fn ($rule) => $rule->value, FieldKinds::all());
    ksort($fixtureRules);
    ksort($registryRules);

    expect($registryRules)->toBe($fixtureRules);
});

it('names every operation type as the op of some kind', function () {
    $ops = array_values(array_unique(array_map(fn (array $kind) => $kind['op'], MergeFixture::kinds())));
    $types = array_map(fn (OperationType $type) => $type->value, OperationType::cases());

    expect($ops)->toEqualCanonicalizing($types);
});

it('has the route milestones of the shared file', function () {
    expect(RouteMilestones::KEYS)->toBe(MergeFixture::routeMilestones());
});

it('seeds its world without errors', function () {
    ProgressWorld::seed(MergeFixture::world());

    expect(DB::table('exercises')->count())->toBe(4)
        ->and(ProgressWorld::contentVersion())->toBe(MergeFixture::world()['contentVersion']);
});

it('has 275 merge cases for PHP', function () {
    expect(MergeFixture::mergeCases())->toHaveCount(275);
});

it('merges a case', function (array $case) {
    ProgressWorld::seed(MergeFixture::world());
    $user = ProgressWorld::user();
    ProgressWorld::head($user, revision: TRANSACTION_REVISION);
    MergeKinds::seed($user->id, $case['kind'], $case['stored'], $case['incoming'][0], STORED_REVISION);
    $now = CarbonImmutable::parse('2026-10-06T12:00:00.000Z');
    $writer = new OperationWriter;

    $changed = [];
    foreach ($case['incoming'] as $index => $write) {
        $effectiveAt = ($write['at'] ?? null) === null ? null : CarbonImmutable::parse($write['at']);
        $checked = MergeKinds::checked($case['kind'], $write, sprintf('00000000-0000-4000-8000-%012d', $index + 1), MergeFixture::world()['contentVersion']);
        $changed[] = $writer->write($user->id, $checked, $effectiveAt, TRANSACTION_REVISION, $now)->changed;
    }

    expect($changed)->toBe($case['expect']['changed'])
        ->and(MergeKinds::read($user->id, $case['kind']))->toBe($case['expect']['state'])
        ->and(MergeKinds::rowRevision($user->id, $case['kind']))->toBe(in_array(true, $changed, true) ? TRANSACTION_REVISION : STORED_REVISION)
        ->and((int) DB::table('progress_heads')->where('user_id', $user->id)->value('revision'))->toBe(TRANSACTION_REVISION);
    ProgressInvariants::assertClean($user->id);
})->with(fn () => MergeFixture::mergeCaseDataset());
