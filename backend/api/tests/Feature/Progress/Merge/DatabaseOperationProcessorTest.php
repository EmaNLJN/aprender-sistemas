<?php

use App\Progress\Operations\DatabaseOperationProcessor;
use App\Progress\Operations\OperationProcessor;
use App\Progress\Operations\RejectionReason;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;

function processorRaw(array $fields, string $id = '00000000-0000-4000-8000-000000000001'): array
{
    return ['id' => $id, 'at' => '2026-10-05T12:00:00.000Z', ...$fields];
}

it('is the OperationProcessor of the container', function () {
    expect(app(DatabaseOperationProcessor::class))->toBeInstanceOf(OperationProcessor::class);
});

it('decodes, checks against the content and applies a batch for an account', function () {
    ProgressWorld::seed(MergeFixture::world());
    $user = ProgressWorld::user();
    ProgressWorld::head($user, revision: 4);
    $processor = app(DatabaseOperationProcessor::class);
    $now = CarbonImmutable::parse('2026-10-06T12:00:00.000Z');

    $checked = $processor->check($processor->decode([
        processorRaw(['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'Idea'], '00000000-0000-4000-8000-000000000001'),
        processorRaw(['type' => 'exercise.reflection', 'exerciseId' => 'fx-no-existe', 'text' => 'Idea'], '00000000-0000-4000-8000-000000000002'),
        processorRaw(['type' => 'exercise.reflection', 'exerciseId' => 'fx-rust-01', 'text' => 'Idea', 'solvedAt' => 'x'], '00000000-0000-4000-8000-000000000003'),
    ]), MergeFixture::world()['contentVersion']);
    $applied = $processor->apply($user->id, $checked[0], CarbonImmutable::parse('2026-10-05T12:00:00.000Z'), 4, $now);
    $repeated = $processor->apply($user->id, $checked[0], CarbonImmutable::parse('2026-10-05T12:00:00.000Z'), 4, $now);

    expect(array_map(fn ($item) => $item->reason, $checked))->toBe([null, RejectionReason::UnknownReference, RejectionReason::Invalid])
        ->and($applied->changed)->toBeTrue()
        ->and($repeated->changed)->toBeFalse()
        ->and(DB::table('exercise_progress')->where('user_id', $user->id)->value('reflection'))->toBe('Idea')
        ->and((int) DB::table('exercise_progress')->where('user_id', $user->id)->value('revision'))->toBe(4);
    ProgressInvariants::assertClean($user->id);
});
