<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\ImportCases;
use Tests\Support\LosslessNormalization;
use Tests\Support\ProgressInvariants;
use Tests\Support\RunInvariants;
use Tests\Support\V1Projection;

const LOSSLESS_IMPORT_ID = '6f1c2b9e-4a7d-4c1e-9b2f-0a1b2c3d4e5f';
const LOSSLESS_OTHER_IMPORT_ID = '7a2d3c0f-5b8e-4d2f-8c3a-1b2c3d4e5f60';
const LOSSLESS_SECTIONS = ['route', 'lab', 'campaign', 'systems'];

/** @return array<string, stdClass> the normalized sections of each case, read with objects so that `{}` stays `{}` */
function losslessNormalizedByCase(): array
{
    $document = json_decode((string) file_get_contents(base_path('tests/Fixtures/shared/import-cases.json')), false, 512, JSON_THROW_ON_ERROR);
    $byCase = [];
    foreach ($document->cases as $case) {
        $byCase[$case->id] = $case->normalized;
    }

    return $byCase;
}

/** @return array<string, mixed> */
function losslessBody(array $case, string $importId = LOSSLESS_IMPORT_ID): array
{
    return [
        'format' => 2, 'importId' => $importId, 'epoch' => 1, 'source' => $case['source'],
        'raw' => $case['raw'], 'normalized' => losslessNormalizedByCase()[$case['id']],
    ];
}

/** @return stdClass the four sections of the projection, decoded as JSON */
function losslessProjectionOf(int $userId): stdClass
{
    return json_decode(json_encode(V1Projection::of($userId), JSON_THROW_ON_ERROR), false, 512, JSON_THROW_ON_ERROR);
}

/** @return array<string, int> */
function losslessRowCounts(int $userId): array
{
    $counts = ['progress_imports' => DB::table('progress_imports')->count(), 'attempts' => DB::table('attempts')->where('user_id', $userId)->count()];
    foreach (['exercise_progress', 'drafts', 'campaign_seals', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations', 'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences'] as $table) {
        $counts[$table] = DB::table($table)->where('user_id', $userId)->count();
    }

    return $counts;
}

beforeEach(function () {
    $this->artisan('content:import')->assertExitCode(0);
    $this->user = User::factory()->create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

describe('SC-001, for each frozen case', function () {
    it('answers 201 with the rows of the contract', function (array $case) {
        $response = $this->browser->post('/api/progress/import', losslessBody($case));

        $response->assertCreated();
        expect($response->json('report.written'))->toEqual($case['expect']['written']);
    })->with(fn () => ImportCases::dataset());

    it('loses nothing: the four sections of the raw hold in the projection', function (array $case) {
        $this->browser->post('/api/progress/import', losslessBody($case))->assertCreated();

        $projection = losslessProjectionOf($this->user->id);
        $raw = ImportCases::rawSections($case);
        $holds = [];
        foreach (LOSSLESS_SECTIONS as $section) {
            $holds[$section] = LosslessNormalization::holds($raw[$section], $projection->{$section});
        }
        expect($holds)->toBe(array_fill_keys(LOSSLESS_SECTIONS, true));
    })->with(fn () => ImportCases::dataset());

    it('projects exactly the normalized of the case', function (array $case) {
        $this->browser->post('/api/progress/import', losslessBody($case))->assertCreated();

        $projection = losslessProjectionOf($this->user->id);
        $normalized = losslessNormalizedByCase()[$case['id']];
        $same = [];
        foreach (LOSSLESS_SECTIONS as $section) {
            $same[$section] = LosslessNormalization::holds($normalized->{$section}, $projection->{$section})
                && LosslessNormalization::holds($projection->{$section}, $normalized->{$section});
        }
        expect($same)->toBe(array_fill_keys(LOSSLESS_SECTIONS, true));
    })->with(fn () => ImportCases::dataset());

    it('answers 200 with the same body to the same request and changes nothing', function (array $case) {
        $first = $this->browser->post('/api/progress/import', losslessBody($case))->assertCreated();
        $before = [losslessRowCounts($this->user->id), DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision'), losslessProjectionOf($this->user->id)];

        $again = $this->browser->post('/api/progress/import', losslessBody($case));

        $again->assertOk();
        expect($again->json())->toBe($first->json())
            ->and([losslessRowCounts($this->user->id), DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision'), losslessProjectionOf($this->user->id)])->toEqual($before);
    })->with(fn () => ImportCases::dataset());

    it('answers 200 to a new importId with the same raw and changes nothing', function (array $case) {
        $first = $this->browser->post('/api/progress/import', losslessBody($case))->assertCreated();
        $before = [losslessRowCounts($this->user->id), DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision')];

        $again = $this->browser->post('/api/progress/import', losslessBody($case, LOSSLESS_OTHER_IMPORT_ID));

        $again->assertOk();
        expect($again->json('importId'))->toBe($first->json('importId'))
            ->and([losslessRowCounts($this->user->id), DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision')])->toEqual($before);
    })->with(fn () => ImportCases::dataset());

    it('leaves the invariants of progress and of runs clean', function (array $case) {
        $this->browser->post('/api/progress/import', losslessBody($case))->assertCreated();

        ProgressInvariants::assertClean($this->user->id);
        RunInvariants::assertClean();
    })->with(fn () => ImportCases::dataset());
});

describe('the same copy in another format', function () {
    it('asks for confirmation and, with it, answers 201 with everything at 0 and the revision still', function () {
        $cases = ImportCases::all();
        $this->browser->post('/api/progress/import', losslessBody($cases['master-2a278ad-storage']))->assertCreated();
        $revision = DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision');
        $counts = losslessRowCounts($this->user->id);
        $export = losslessBody($cases['master-2a278ad-export'], LOSSLESS_OTHER_IMPORT_ID);

        $withoutConfirm = $this->browser->post('/api/progress/import', $export);
        $confirmed = $this->browser->post('/api/progress/import', [...$export, 'confirm' => true]);

        $withoutConfirm->assertStatus(409)->assertJsonPath('code', 'import_needs_confirmation');
        $confirmed->assertCreated();
        expect($confirmed->json('report.written'))->toBe(array_fill_keys(array_keys($cases['master-2a278ad-export']['expect']['written']), 0))
            ->and($confirmed->json('revision'))->toBe($revision)
            ->and(DB::table('progress_heads')->where('user_id', $this->user->id)->value('revision'))->toBe($revision)
            ->and(losslessRowCounts($this->user->id))->toBe([...$counts, 'progress_imports' => $counts['progress_imports'] + 1]);
    });
});

describe('restoring the export after Borrar todo (US5.4, SC-005)', function () {
    it('answers 409 and then 201 and gives back the same projection with the same legacy attempts', function () {
        useSampleBlockedPasswords();
        $user = User::factory()->withPassword('correct horse battery')->create();
        $browser = Browser::for($this)->useDatabaseDrivers()->signIn($user);
        $browser->post('/api/auth/confirm-password', ['password' => 'correct horse battery'])->assertCreated();
        $case = ImportCases::all()['master-2a278ad-export'];
        $browser->post('/api/progress/import', losslessBody($case))->assertCreated();
        $projectionBefore = losslessProjectionOf($user->id);
        $attemptIdsBefore = DB::table('attempts')->where('user_id', $user->id)->orderBy('id')->pluck('id')->all();
        $browser->post('/api/progress/reset', ['format' => 2, 'epoch' => 1])->assertOk();
        $afterReset = losslessBody($case, LOSSLESS_OTHER_IMPORT_ID);
        $afterReset['epoch'] = 2;

        $withoutConfirm = $browser->post('/api/progress/import', $afterReset);
        $confirmed = $browser->post('/api/progress/import', [...$afterReset, 'confirm' => true]);

        $withoutConfirm->assertStatus(409)->assertJsonPath('code', 'import_needs_confirmation');
        $confirmed->assertCreated();
        expect($confirmed->json('report.written.exercises'))->toBe(11)
            ->and($confirmed->json('report.written.attempts'))->toBe(0)
            ->and(losslessProjectionOf($user->id))->toEqual($projectionBefore)
            ->and(DB::table('attempts')->where('user_id', $user->id)->orderBy('id')->pluck('id')->all())->toBe($attemptIdsBefore);
        ProgressInvariants::assertClean($user->id);
        RunInvariants::assertClean();
    });
});
