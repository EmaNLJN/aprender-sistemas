<?php

use App\Models\User;
use App\Progress\ProgressTables;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncDevice;

/** @return array<string, int> */
function writtenRowCounts(): array
{
    $counts = ['sync_operations' => DB::table('sync_operations')->count(), 'progress_heads' => DB::table('progress_heads')->count()];
    foreach (ProgressTables::STATE as $table) {
        $counts[$table] = DB::table($table)->count();
    }

    return $counts;
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->accountA = SyncDevice::signedIn($this);
    $this->accountB = SyncDevice::signedIn($this);
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:00.000Z'));
    $this->accountA->sync([Ops::reflection(1, 'de Ana', '2026-10-05T12:00:00.000Z'), Ops::workshopNote(2, 'nota de Ana', '2026-10-05T12:00:00.000Z')])->assertOk();
});

describe('what belongs to another account', function () {
    it('is not read by GET /api/progress', function () {
        $snapshot = $this->accountB->snapshot()->assertOk();

        expect($snapshot->json('userId'))->toBe($this->accountB->user->id)
            ->and($snapshot->json('revision'))->toBe(0)
            ->and($snapshot->json('exercises'))->toBe([])
            ->and($snapshot->json('workshops.progress'))->toBe([]);
    });

    it('is not returned in the changes of a sync, full or delta', function (array $envelope) {
        $response = $this->accountB->sync([Ops::customTest(10, 'de Beto', '2026-10-05T12:01:00.000Z')], $envelope)->assertOk();

        expect(json_encode($response->json('changes')))->not->toContain('de Ana')
            ->and($response->json('changes.workshops.progress'))->toBe([]);
    })->with([
        'a full one' => [[]],
        'a delta from revision 0 with the version known' => [['knownRevision' => 0]],
        'a delta that claims a revision of the other account' => [['knownRevision' => 1]],
    ]);

    it('is not modified by a user_id in the envelope, which is ignored', function () {
        $before = $this->accountA->snapshot()->json();
        $ofAccountA = ['user_id' => $this->accountA->user->id, 'userId' => $this->accountA->user->id];

        $this->accountB->sync([Ops::reflection(11, 'de Beto', '2026-10-05T12:05:00.000Z')], $ofAccountA)->assertOk();

        expect($this->accountA->snapshot()->json())->toBe($before)
            ->and(DB::table('exercise_progress')->where('user_id', $this->accountB->user->id)->value('reflection'))->toBe('de Beto')
            ->and(DB::table('sync_operations')->where('user_id', $this->accountA->user->id)->count())->toBe(2);
    });

    it('is not modified by an operation that carries a user_id, which is rejected as invalid', function () {
        $before = $this->accountA->snapshot()->json();
        $operation = Ops::reflection(12, 'pisada', '2026-10-05T12:05:00.000Z') + ['user_id' => $this->accountA->user->id];

        $response = $this->accountB->sync([$operation])->assertOk();

        expect($response->json('results.0'))->toBe(['id' => SyncDevice::operationId(12), 'status' => 'rejected', 'reason' => 'invalid'])
            ->and($this->accountA->snapshot()->json())->toBe($before)
            ->and(DB::table('exercise_progress')->where('user_id', $this->accountB->user->id)->count())->toBe(0);
    });

    it('is not read through a user_id in the query of the snapshot', function () {
        $snapshot = $this->accountB->browser->get('/api/progress?user_id='.$this->accountA->user->id)->assertOk();

        expect($snapshot->json('userId'))->toBe($this->accountB->user->id)
            ->and($snapshot->json('exercises'))->toBe([]);
    });

    it('does not make a UUID of the other account a duplicate', function () {
        $response = $this->accountB->sync([Ops::reflection(1, 'de Beto', '2026-10-05T12:05:00.000Z')])->assertOk();

        expect($response->json('results.0.status'))->toBe('applied')
            ->and($this->accountB->exercise()['reflection']['text'])->toBe('de Beto')
            ->and($this->accountA->exercise()['reflection']['text'])->toBe('de Ana');
    });
});

describe('the account header', function () {
    it('answers 409 account_mismatch and writes nothing when it is missing', function () {
        $before = writtenRowCounts();

        $response = $this->accountB->browser->withoutAccountHeader()->post('/api/sync', $this->accountB->envelope([Ops::reflection(20, 'x', '2026-10-05T12:05:00.000Z')]));

        $response->assertStatus(409)->assertJsonPath('code', 'account_mismatch');
        expect(writtenRowCounts())->toBe($before);
    });

    it('answers 409 account_mismatch and writes nothing when it names another account', function () {
        $before = writtenRowCounts();

        $response = $this->accountB->browser->withAccountHeader((string) $this->accountA->user->id)->post('/api/sync', $this->accountB->envelope([Ops::reflection(21, 'x', '2026-10-05T12:05:00.000Z')]));

        $response->assertStatus(409)->assertJsonPath('code', 'account_mismatch');
        expect(writtenRowCounts())->toBe($before);
    });

    it('is not asked by the read', function () {
        $this->accountB->browser->withoutAccountHeader()->get('/api/progress')->assertOk()->assertJsonPath('userId', $this->accountB->user->id);
    });
});

it('answers 401 to both routes without a session', function () {
    $anonymous = Browser::for($this)->useDatabaseDrivers();

    $anonymous->get('/api/progress')->assertUnauthorized();
    $anonymous->post('/api/sync', $this->accountA->envelope([]))->assertUnauthorized();
});

describe('an administrator', function () {
    it('syncs and reads like a student', function () {
        $admin = SyncDevice::signedIn($this, User::factory()->admin()->create());

        $response = $admin->sync([Ops::reflection(30, 'del admin', '2026-10-05T12:05:00.000Z')])->assertOk();

        expect($response->json('results.0.status'))->toBe('applied')
            ->and($response->json('revision'))->toBe(1)
            ->and($admin->exercise()['reflection']['text'])->toBe('del admin')
            ->and($admin->snapshot()->json('userId'))->toBe($admin->user->id)
            ->and($this->accountA->exercise()['reflection']['text'])->toBe('de Ana');
    });
});
