<?php

use Carbon\CarbonImmutable;
use Tests\Support\MergeFixture;
use Tests\Support\MergeKinds;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\SyncDevice;

/** @return array<string, array{array<string, mixed>}> */
function textFidelityDataset(): array
{
    $cases = [];
    foreach (['exercise.reflection', 'exercise.customTest', 'workshop.note', 'route.note'] as $kind) {
        foreach (['to-empty-string', 'whitespace-kept'] as $situation) {
            $id = "{$kind}/text/{$situation}";
            $cases[$id] = [MergeFixture::mergeCases()[$id]];
        }
    }

    return $cases;
}

it('keeps a text exactly as the device sent it, through POST /api/sync', function (array $case) {
    ProgressWorld::seed(MergeFixture::world());
    $device = SyncDevice::signedIn($this);
    ProgressWorld::head($device->user, revision: 5);
    $incoming = $case['incoming'][0];
    MergeKinds::seed($device->user->id, $case['kind'], $case['stored'], $incoming, 5);
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:00.000Z'));
    $checked = MergeKinds::checked($case['kind'], $incoming, SyncDevice::operationId(1), MergeFixture::world()['contentVersion']);
    $operation = ['id' => $checked->id, 'type' => $checked->operation->type->value, 'at' => $incoming['at'], ...$checked->operation->values];

    $device->sync([$operation], ['knownRevision' => 5])->assertOk()->assertJsonPath('results.0.status', 'applied');

    expect(MergeKinds::read($device->user->id, $case['kind']))->toBe($case['expect']['state']);
})->with(fn () => textFidelityDataset());

it('has the eight text cases of the fixture', function () {
    expect(textFidelityDataset())->toHaveCount(8);
});

it('answers the empty string and the whitespace back in the changes of the same batch', function () {
    ProgressWorld::seed(MergeFixture::world());
    $device = SyncDevice::signedIn($this);
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:00.000Z'));
    $operations = [
        ['id' => SyncDevice::operationId(1), 'type' => 'exercise.reflection', 'at' => '2026-10-05T12:09:00.000Z', 'exerciseId' => 'fx-rust-01', 'text' => ''],
        ['id' => SyncDevice::operationId(2), 'type' => 'exercise.customTest', 'at' => '2026-10-05T12:09:00.000Z', 'exerciseId' => 'fx-rust-01', 'text' => "  sangría\n  "],
    ];

    $response = $device->sync($operations)->assertOk();

    expect($response->json('changes.exercises.0.reflection.text'))->toBe('')
        ->and($response->json('changes.exercises.0.customTest.text'))->toBe("  sangría\n  ")
        ->and($device->exercise()['reflection']['text'])->toBe('');
});
