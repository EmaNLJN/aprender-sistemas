<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;
use Tests\Support\PopulatedAccount;

function exportConfirmPasswordOf(Browser $browser): Browser
{
    $browser->post('/api/auth/confirm-password', ['password' => 'password'])->assertCreated();

    return $browser;
}

function exportRequest(Browser $browser): TestResponse
{
    return $browser->post('/api/me/export');
}

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 15:30:00.000');
    $this->ana = PopulatedAccount::create(['email' => 'ana@example.com']);
    $this->beto = PopulatedAccount::create(['email' => 'beto-secret@example.com']);
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->ana);
});

afterEach(fn () => Carbon::setTestNow());

it('answers 423 without the reconfirmed password', function () {
    exportRequest($this->browser)->assertStatus(423)->assertJsonPath('code', 'password_confirmation_required');
});

it('streams the document as an attachment with the four headers', function () {
    $response = exportRequest(exportConfirmPasswordOf($this->browser))->assertOk();

    expect($response->headers->get('Content-Type'))->toStartWith('application/json')
        ->and($response->headers->get('Content-Disposition'))->toBe('attachment; filename="taller-'.$this->ana->id.'-20261012.json"')
        ->and($response->headers->get('Cache-Control'))->toContain('no-store')
        ->and($response->headers->get('X-Accel-Buffering'))->toBe('no');
});

it('streams a valid document with only the data of the signed in account', function () {
    $response = exportRequest(exportConfirmPasswordOf($this->browser))->assertOk();
    $content = $response->streamedContent();
    $document = json_decode($content, true, flags: JSON_THROW_ON_ERROR);

    expect($document['format'])->toBe('taller-export-2')
        ->and($document['exportedAt'])->toBe('2026-10-12T15:30:00.000Z')
        ->and($document['account']['id'])->toBe($this->ana->id)
        ->and($document['account']['email'])->toBe('ana@example.com')
        ->and($document['attempts'])->toHaveCount(1)
        ->and($content)->not->toContain('beto-secret@example.com');
    $betoAttemptId = DB::table('attempts')->where('user_id', $this->beto->id)->value('id');
    expect(array_column($document['attempts'], 'id'))->not->toContain($betoAttemptId);
});

it('exports an account whose email is not verified', function () {
    $unverified = User::factory()->unverified()->create();
    $browser = Browser::for($this)->useDatabaseDrivers()->signIn($unverified);

    exportRequest(exportConfirmPasswordOf($browser))->assertOk();
});

it('answers 401 for an account that is being deleted', function () {
    $browser = exportConfirmPasswordOf($this->browser);
    DB::table('users')->where('id', $this->ana->id)->update(['status' => 'deleting']);

    exportRequest($browser)->assertStatus(401)->assertJsonPath('code', 'unauthenticated');
});

it('does not spend the quota on requests without the confirmed password', function () {
    foreach (range(1, 5) as $ignored) {
        exportRequest($this->browser)->assertStatus(423);
    }
    $browser = exportConfirmPasswordOf($this->browser);

    foreach (range(1, 3) as $ignored) {
        exportRequest($browser)->assertOk()->streamedContent();
    }
});

it('answers 429 with Retry-After on the fourth confirmed export of the day', function () {
    $browser = exportConfirmPasswordOf($this->browser);
    foreach (range(1, 3) as $ignored) {
        exportRequest($browser)->assertOk()->streamedContent();
    }

    $response = exportRequest($browser)->assertStatus(429);

    expect($response->json('code'))->toBe('too_many_requests')
        ->and($response->headers->get('Retry-After'))->not->toBeNull();
});

it('logs account.exported with the user id', function () {
    Log::spy();

    exportRequest(exportConfirmPasswordOf($this->browser))->assertOk()->streamedContent();

    Log::shouldHaveReceived('info')->with('account.exported', ['user_id' => $this->ana->id])->once();
});
