<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\SyncDevice;

const THROTTLE_PASSWORD = 'correct horse battery';

function throttleImportId(string $tag): string
{
    $digest = md5($tag);

    return sprintf('%s-%s-4%s-8%s-%s', substr($digest, 0, 8), substr($digest, 8, 4), substr($digest, 12, 3), substr($digest, 15, 3), substr($digest, 18, 12));
}

function throttleImport(SyncDevice $device, string $tag, bool $confirm = false): TestResponse
{
    return $device->browser->post('/api/progress/import', [
        'format' => 2, 'importId' => throttleImportId($tag), 'epoch' => 1, 'source' => 'storage', 'raw' => json_encode(['copy' => $tag], JSON_THROW_ON_ERROR),
        'normalized' => ['lab' => ['version' => 1, 'selected' => ['rust' => null, 'go' => null], 'records' => [
            'fx-rust-01' => ['predictionCorrect' => false, 'assisted' => true, 'solutionSeen' => false],
        ]]],
        'confirm' => $confirm,
    ]);
}

beforeEach(function () {
    useSampleBlockedPasswords();
    ProgressWorld::seed(MergeFixture::world());
    $this->travelTo(CarbonImmutable::parse('2026-10-07T12:00:00.000Z'));
    $this->user = User::factory()->withPassword(THROTTLE_PASSWORD)->create();
    $this->device = SyncDevice::signedIn($this, $this->user);
});

describe('the imports', function () {
    it('lets three through, counting a 200 and a 409 too, and answers 429 with Retry-After to the 4th of the hour', function () {
        throttleImport($this->device, 'a')->assertCreated();
        throttleImport($this->device, 'a')->assertOk();
        throttleImport($this->device, 'b')->assertStatus(409);

        $fourth = throttleImport($this->device, 'b', confirm: true);

        $fourth->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
        expect((int) $fourth->headers->get('Retry-After'))->toBeBetween(1, 3600)
            ->and(DB::table('progress_imports')->where('user_id', $this->user->id)->count())->toBe(1);
    });

    it('lets the account import again when the hour is over', function () {
        foreach (['a', 'b', 'c'] as $tag) {
            throttleImport($this->device, $tag, confirm: true)->assertCreated();
        }
        $retryAfter = (int) throttleImport($this->device, 'd', confirm: true)->assertStatus(429)->headers->get('Retry-After');

        $this->travelTo(CarbonImmutable::parse('2026-10-07T12:00:00.000Z')->addSeconds($retryAfter));
        $again = SyncDevice::signedIn($this, $this->user);

        throttleImport($again, 'd', confirm: true)->assertCreated();
    });

    it('gives every account its own count', function () {
        foreach (['a', 'b', 'c', 'd'] as $tag) {
            throttleImport($this->device, $tag, confirm: true);
        }
        $other = SyncDevice::signedIn($this, ProgressWorld::user());

        throttleImport($other, 'e')->assertCreated();
    });
});

describe('the resets', function () {
    it('lets three through and answers 429 with Retry-After to the 4th of the day', function () {
        $this->device->browser->post('/api/auth/confirm-password', ['password' => THROTTLE_PASSWORD])->assertCreated();
        foreach ([1, 2, 3] as $epoch) {
            $this->device->browser->post('/api/progress/reset', ['format' => 2, 'epoch' => $epoch])->assertOk();
        }

        $fourth = $this->device->browser->post('/api/progress/reset', ['format' => 2, 'epoch' => 4]);

        $fourth->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
        expect((int) $fourth->headers->get('Retry-After'))->toBeBetween(1, 86400);
    });

    it('does not share the count with the imports', function () {
        foreach (['a', 'b', 'c'] as $tag) {
            throttleImport($this->device, $tag, confirm: true)->assertCreated();
        }
        $this->device->browser->post('/api/auth/confirm-password', ['password' => THROTTLE_PASSWORD])->assertCreated();

        $this->device->browser->post('/api/progress/reset', ['format' => 2, 'epoch' => 1])->assertOk();
    });
});
