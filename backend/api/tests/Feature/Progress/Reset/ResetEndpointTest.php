<?php

use App\Models\User;
use App\Progress\ProgressTables;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressInvariants;
use Tests\Support\ProgressWorld;
use Tests\Support\RunInvariants;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncDevice;
use Tests\Support\V1Projection;

const RESET_ENDPOINT_PASSWORD = 'correct horse battery';

function resetEndpointImportId(string $tag): string
{
    $digest = md5($tag);

    return sprintf('%s-%s-4%s-8%s-%s', substr($digest, 0, 8), substr($digest, 8, 4), substr($digest, 12, 3), substr($digest, 15, 3), substr($digest, 18, 12));
}

/** @return array<string, mixed> */
function resetEndpointNormalized(): array
{
    return [
        'route' => [
            'version' => 1, 'language' => 'go', 'completed' => ['fx-step-1'], 'milestones' => ['rust-memory'], 'favorites' => ['fx-res-1'],
            'quizAnswers' => ['fx-step-1' => 1],
            'notes' => ['rust' => ['learned' => 'aprendí', 'next' => ''], 'go' => ['learned' => '', 'next' => 'seguir']],
            'minutes' => 45,
        ],
        'lab' => [
            'version' => 1, 'selected' => ['rust' => 'fx-rust-01', 'go' => null],
            'records' => [
                'fx-rust-01' => [
                    'predictionCorrect' => true, 'assisted' => false, 'solutionSeen' => false, 'draft' => 'fn borrador() {}', 'reflection' => 'reflexión',
                    'solvedAt' => 1790000000123, 'reviewAt' => 1790100000456, 'reviewedAt' => 1790000500789, 'confidence' => 'practice',
                    'result' => [
                        'code' => 'fn main() {}', 'success' => true, 'transportError' => false, 'stdout' => 'salida', 'stderr' => '',
                        'tests' => [['id' => 't1', 'passed' => true], ['id' => 't2', 'passed' => true], ['id' => 't3', 'passed' => true]],
                        'time' => 1789999000321, 'customTest' => '', 'customPassed' => false,
                    ],
                ],
            ],
        ],
        'campaign' => ['version' => 1, 'seals' => ['fx-rust-01' => ['code' => true, 'prediction' => false, 'assisted' => true]], 'checkpoints' => ['fx-world-1' => ['passed' => true, 'lastAnswer' => 1]]],
        'systems' => ['version' => 1, 'records' => ['rust:fx-workshop-1' => ['observed' => ['fx-obj-2', 'fx-obj-1'], 'code' => true, 'predicted' => false, 'answer' => null, 'steps' => [1, 3], 'note' => 'nota']]],
    ];
}

function resetEndpointImport(SyncDevice $device, string $tag, int $epoch = 1, bool $confirm = false): TestResponse
{
    return $device->browser->post('/api/progress/import', [
        'format' => 2, 'importId' => resetEndpointImportId("{$tag}:{$epoch}"), 'epoch' => $epoch, 'source' => 'export',
        'raw' => json_encode(['copy' => $tag], JSON_THROW_ON_ERROR), 'normalized' => resetEndpointNormalized(), 'confirm' => $confirm,
    ]);
}

function resetEndpointReset(SyncDevice $device, int $epoch): TestResponse
{
    return $device->browser->post('/api/progress/reset', ['format' => 2, 'epoch' => $epoch]);
}

/** @return array<string, int> */
function resetEndpointRowCounts(int $userId): array
{
    $counts = ['sync_operations' => DB::table('sync_operations')->where('user_id', $userId)->count(), 'attempts' => DB::table('attempts')->where('user_id', $userId)->count()];
    foreach (ProgressTables::STATE as $table) {
        $counts[$table] = DB::table($table)->where('user_id', $userId)->count();
    }

    return $counts;
}

beforeEach(function () {
    useSampleBlockedPasswords();
    ProgressWorld::seed(MergeFixture::world());
    $this->user = User::factory()->withPassword(RESET_ENDPOINT_PASSWORD)->create();
    $this->device = SyncDevice::signedIn($this, $this->user);
    $this->device->browser->post('/api/auth/confirm-password', ['password' => RESET_ENDPOINT_PASSWORD])->assertCreated();
    resetEndpointImport($this->device, 'copia')->assertCreated();
});

describe('Borrar todo', function () {
    it('answers 200 with the next epoch and the next revision', function () {
        $revisionBefore = $this->device->snapshot()->json('revision');

        $response = resetEndpointReset($this->device, 1);

        $response->assertOk();
        expect($response->json())->toBe(['epoch' => 2, 'revision' => $revisionBefore + 1]);
    });

    it('leaves the photo of the new epoch empty, with the moment of the reset', function () {
        resetEndpointReset($this->device, 1)->assertOk();

        $photo = $this->device->snapshot()->assertOk();

        expect($photo->json('epoch'))->toBe(2)
            ->and($photo->json('resetAt'))->not->toBeNull()
            ->and($photo->json('exercises'))->toBe([])
            ->and($photo->json('drafts'))->toBe([])
            ->and($photo->json('campaign'))->toBe(['seals' => [], 'checkpoints' => []])
            ->and($photo->json('workshops'))->toBe(['progress' => [], 'objectives' => [], 'steps' => []])
            ->and($photo->json('route'))->toBe(['marks' => [], 'quiz' => [], 'notes' => []])
            ->and($photo->json('preferences'))->toBeNull();
    });

    it('rejects a sync of the previous epoch with 409 epoch_mismatch and writes nothing', function () {
        $revision = resetEndpointReset($this->device, 1)->json('revision');
        $before = [resetEndpointRowCounts($this->user->id), DB::table('sync_operations')->count()];
        $at = now()->subMinute()->toIso8601ZuluString('millisecond');

        $response = $this->device->sync([Ops::reflection(1, 'de la época vieja', $at)], ['epoch' => 1]);

        $response->assertStatus(409)->assertJsonPath('code', 'epoch_mismatch')->assertJsonPath('epoch', 2)->assertJsonPath('revision', $revision);
        expect([resetEndpointRowCounts($this->user->id), DB::table('sync_operations')->count()])->toBe($before);
    });

    it('rejects an import of the previous epoch with 409 epoch_mismatch and writes nothing', function () {
        resetEndpointReset($this->device, 1)->assertOk();
        $before = resetEndpointRowCounts($this->user->id);

        $response = resetEndpointImport($this->device, 'otra', epoch: 1);

        $response->assertStatus(409)->assertJsonPath('code', 'epoch_mismatch')->assertJsonPath('epoch', 2);
        expect(resetEndpointRowCounts($this->user->id))->toBe($before);
    });

    it('keeps the attempts, the imports and the account, and leaves the invariants clean', function () {
        $before = resetEndpointRowCounts($this->user->id);

        resetEndpointReset($this->device, 1)->assertOk();

        $after = resetEndpointRowCounts($this->user->id);
        expect($after['attempts'])->toBe($before['attempts'])->toBe(1)
            ->and(DB::table('progress_imports')->where('user_id', $this->user->id)->count())->toBe(1)
            ->and(DB::table('users')->where('id', $this->user->id)->count())->toBe(1);
        ProgressInvariants::assertClean($this->user->id);
        RunInvariants::assertClean();
    });

    it('answers 409 epoch_mismatch to the second reset with the same epoch', function () {
        resetEndpointReset($this->device, 1)->assertOk();

        $second = resetEndpointReset($this->device, 1);

        $second->assertStatus(409)->assertJsonPath('code', 'epoch_mismatch')->assertJsonPath('epoch', 2);
        expect(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(2);
    });

    it('answers 429 with Retry-After to the 4th reset of the day', function () {
        foreach ([1, 2, 3] as $epoch) {
            resetEndpointReset($this->device, $epoch)->assertOk();
        }

        $response = resetEndpointReset($this->device, 4);

        $response->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
        expect((int) $response->headers->get('Retry-After'))->toBeBetween(1, 86400)
            ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('epoch'))->toBe(4);
    });
});

describe('restoring the export after Borrar todo (US5.4)', function () {
    it('asks for confirmation, answers 201 and not an empty 200, and restores the same projection with the same attempts', function () {
        $projectionBefore = json_decode(json_encode(V1Projection::of($this->user->id), JSON_THROW_ON_ERROR), false, 512, JSON_THROW_ON_ERROR);
        $attemptIdsBefore = DB::table('attempts')->where('user_id', $this->user->id)->pluck('id')->all();
        resetEndpointReset($this->device, 1)->assertOk();

        $withoutConfirm = resetEndpointImport($this->device, 'copia', epoch: 2);
        $confirmed = resetEndpointImport($this->device, 'copia', epoch: 2, confirm: true);

        $withoutConfirm->assertStatus(409)->assertJsonPath('code', 'import_needs_confirmation');
        $confirmed->assertCreated();
        $projectionAfter = json_decode(json_encode(V1Projection::of($this->user->id), JSON_THROW_ON_ERROR), false, 512, JSON_THROW_ON_ERROR);
        expect($projectionAfter)->toEqual($projectionBefore)
            ->and($confirmed->json('report.written.exercises'))->toBe(1)
            ->and($confirmed->json('report.written.attempts'))->toBe(0)
            ->and(DB::table('attempts')->where('user_id', $this->user->id)->pluck('id')->all())->toBe($attemptIdsBefore)
            ->and(DB::table('exercise_progress')->where('user_id', $this->user->id)->value('last_attempt_id'))->toBe($attemptIdsBefore[0]);
        ProgressInvariants::assertClean($this->user->id);
        RunInvariants::assertClean();
    });
});
