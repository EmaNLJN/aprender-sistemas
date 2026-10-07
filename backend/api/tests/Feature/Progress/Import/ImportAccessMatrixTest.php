<?php

use App\Models\User;
use App\Progress\ProgressTables;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\SyncDevice;

const ACCESS_PASSWORD = 'correct horse battery';

function accessImportId(string $tag): string
{
    $digest = md5($tag);

    return sprintf('%s-%s-4%s-8%s-%s', substr($digest, 0, 8), substr($digest, 8, 4), substr($digest, 12, 3), substr($digest, 15, 3), substr($digest, 18, 12));
}

/** @return array<string, mixed> */
function accessImportBody(string $tag, array $overrides = []): array
{
    return [
        'format' => 2, 'importId' => accessImportId($tag), 'epoch' => 1, 'source' => 'storage', 'raw' => json_encode(['copy' => $tag], JSON_THROW_ON_ERROR),
        'normalized' => ['lab' => ['version' => 1, 'selected' => ['rust' => null, 'go' => null], 'records' => [
            'fx-rust-01' => ['predictionCorrect' => false, 'assisted' => true, 'solutionSeen' => false, 'reflection' => "de {$tag}"],
        ]]],
        ...$overrides,
    ];
}

function accessConfirmPassword(SyncDevice $device): void
{
    $device->browser->post('/api/auth/confirm-password', ['password' => ACCESS_PASSWORD])->assertCreated();
}

function accessReset(SyncDevice $device, array $overrides = []): TestResponse
{
    return $device->browser->post('/api/progress/reset', ['format' => 2, 'epoch' => 1, ...$overrides]);
}

/** @return array<string, int> */
function accessRowCounts(): array
{
    $counts = ['progress_imports' => DB::table('progress_imports')->count(), 'attempts' => DB::table('attempts')->count(), 'progress_heads' => DB::table('progress_heads')->count()];
    foreach (ProgressTables::STATE as $table) {
        $counts[$table] = DB::table($table)->count();
    }

    return $counts;
}

function accessPhoto(SyncDevice $device): array
{
    return Arr::except($device->snapshot()->assertOk()->json(), 'serverTime');
}

beforeEach(function () {
    useSampleBlockedPasswords();
    ProgressWorld::seed(MergeFixture::world());
    $this->accountA = SyncDevice::signedIn($this, User::factory()->withPassword(ACCESS_PASSWORD)->create());
    $this->accountB = SyncDevice::signedIn($this, User::factory()->withPassword(ACCESS_PASSWORD)->create());
    $this->accountA->browser->post('/api/progress/import', accessImportBody('Ana'))->assertCreated();
    $this->photoOfA = accessPhoto($this->accountA);
});

describe('what belongs to another account', function () {
    it('is not imported over by an account that sends the user_id of the other', function () {
        $ofAccountA = ['user_id' => $this->accountA->user->id, 'userId' => $this->accountA->user->id];

        $this->accountB->browser->post('/api/progress/import', accessImportBody('Beto', $ofAccountA))->assertCreated();

        expect(accessPhoto($this->accountA))->toBe($this->photoOfA)
            ->and(DB::table('exercise_progress')->where('user_id', $this->accountB->user->id)->value('reflection'))->toBe('de Beto')
            ->and(DB::table('progress_imports')->where('user_id', $this->accountA->user->id)->count())->toBe(1);
    });

    it('is not deleted by an account that sends the user_id of the other', function () {
        accessConfirmPassword($this->accountB);
        $ofAccountA = ['user_id' => $this->accountA->user->id, 'userId' => $this->accountA->user->id];

        accessReset($this->accountB, $ofAccountA)->assertOk();

        expect(accessPhoto($this->accountA))->toBe($this->photoOfA)
            ->and(DB::table('progress_heads')->where('user_id', $this->accountA->user->id)->value('epoch'))->toBe(1)
            ->and(DB::table('progress_heads')->where('user_id', $this->accountB->user->id)->value('epoch'))->toBe(2);
    });

    it('does not make the same raw of the other account a repeated one', function () {
        $response = $this->accountB->browser->post('/api/progress/import', accessImportBody('Ana', ['importId' => accessImportId('otra')]));

        $response->assertStatus(409)->assertJsonPath('code', 'import_needs_confirmation');
        expect(DB::table('progress_imports')->where('user_id', $this->accountB->user->id)->count())->toBe(0);
    });
});

describe('the account header', function () {
    it('answers 409 account_mismatch and writes nothing to an import that names another account', function () {
        $before = accessRowCounts();

        $response = $this->accountB->browser->withAccountHeader((string) $this->accountA->user->id)->post('/api/progress/import', accessImportBody('Beto'));

        $response->assertStatus(409)->assertJsonPath('code', 'account_mismatch');
        expect(accessRowCounts())->toBe($before);
    });

    it('answers 409 account_mismatch and writes nothing to an import without it', function () {
        $before = accessRowCounts();

        $response = $this->accountB->browser->withoutAccountHeader()->post('/api/progress/import', accessImportBody('Beto'));

        $response->assertStatus(409)->assertJsonPath('code', 'account_mismatch');
        expect(accessRowCounts())->toBe($before);
    });

    it('answers 409 account_mismatch and deletes nothing to a reset that names another account', function () {
        accessConfirmPassword($this->accountB);
        $before = accessRowCounts();

        $response = $this->accountB->browser->withAccountHeader((string) $this->accountA->user->id)->post('/api/progress/reset', ['format' => 2, 'epoch' => 1]);

        $response->assertStatus(409)->assertJsonPath('code', 'account_mismatch');
        expect(accessRowCounts())->toBe($before)
            ->and(accessPhoto($this->accountA))->toBe($this->photoOfA);
    });
});

it('answers 401 to both routes without a session', function () {
    $anonymous = Browser::for($this)->useDatabaseDrivers();

    $anonymous->post('/api/progress/import', accessImportBody('Anónimo'))->assertUnauthorized();
    $anonymous->post('/api/progress/reset', ['format' => 2, 'epoch' => 1])->assertUnauthorized();
});

describe('an administrator', function () {
    it('imports and deletes what is its own and nothing of the others', function () {
        $admin = SyncDevice::signedIn($this, User::factory()->admin()->withPassword(ACCESS_PASSWORD)->create());

        $admin->browser->post('/api/progress/import', accessImportBody('Admin'))->assertCreated();
        $imported = $admin->exercise()['reflection']['text'];
        accessConfirmPassword($admin);
        accessReset($admin)->assertOk();

        expect($imported)->toBe('de Admin')
            ->and($admin->snapshot()->json('exercises'))->toBe([])
            ->and(accessPhoto($this->accountA))->toBe($this->photoOfA);
    });
});

describe('an account with an unverified email', function () {
    beforeEach(function () {
        $this->unverified = SyncDevice::signedIn($this, User::factory()->unverified()->withPassword(ACCESS_PASSWORD)->create());
    });

    it('receives 403 email_unverified when it imports and nothing is written', function () {
        $before = accessRowCounts();

        $response = $this->unverified->browser->post('/api/progress/import', accessImportBody('Sin verificar'));

        $response->assertStatus(403)->assertJsonPath('code', 'email_unverified');
        expect(accessRowCounts())->toBe($before);
    });

    it('can delete its progress', function () {
        accessConfirmPassword($this->unverified);

        accessReset($this->unverified)->assertOk()->assertJsonPath('epoch', 2);
    });
});
