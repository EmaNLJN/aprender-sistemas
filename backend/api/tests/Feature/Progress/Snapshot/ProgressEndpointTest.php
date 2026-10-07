<?php

use App\Models\User;
use App\Progress\AccountLock;
use App\Runs\Record\Instant;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Progress\Snapshot\SnapshotWorld;
use Tests\Support\Browser;
use Tests\Support\ProgressWorld;

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-06 12:00:00.123'));
    $this->user = ProgressWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

function etagWithoutWeakPrefix(string $etag): string
{
    return substr($etag, 2);
}

it('answers 401 without a session', function () {
    Browser::for($this)->useDatabaseDrivers()->get('/api/progress')->assertUnauthorized();
});

it('answers 403 email_unverified when the email is not verified', function () {
    SnapshotWorld::seedContent();
    $unverified = User::factory()->unverified()->create();

    Browser::for($this)->useDatabaseDrivers()->signIn($unverified)->get('/api/progress')->assertForbidden()->assertJsonPath('code', 'email_unverified');
});

it('answers 503 content_not_imported with Retry-After when no content was imported', function () {
    $this->browser->get('/api/progress')->assertStatus(503)->assertJsonPath('code', 'content_not_imported')->assertHeader('Retry-After');
});

it('answers 503 before 304 when no content was imported', function () {
    $this->browser->withHeader('If-None-Match', '*')->get('/api/progress')->assertStatus(503)->assertJsonPath('code', 'content_not_imported');
});

it('answers the snapshot of the account with the keys of the contract in its order', function () {
    SnapshotWorld::seedContent();
    DB::table('progress_heads')->insert(['user_id' => $this->user->id, 'epoch' => 2, 'revision' => 42, 'created_at' => SnapshotWorld::CLOCK, 'updated_at' => SnapshotWorld::CLOCK]);
    SnapshotWorld::insert('route_notes', $this->user, ['language' => 'go', 'field' => 'next', 'body' => 'Una nota', 'set_at' => SnapshotWorld::CLOCK, 'revision' => 40]);

    $response = $this->browser->get('/api/progress');

    $response->assertOk();
    expect($response->json())->toBe([
        'userId' => $this->user->id, 'epoch' => 2, 'revision' => 42, 'resetAt' => null, 'contentVersion' => SnapshotWorld::CONTENT_VERSION,
        'serverTime' => '2026-10-06T12:00:00.123Z', 'full' => true, 'exercises' => [], 'drafts' => [],
        'campaign' => ['seals' => [], 'checkpoints' => []], 'workshops' => ['progress' => [], 'objectives' => [], 'steps' => []],
        'route' => [
            'marks' => [], 'quiz' => [],
            'notes' => [['language' => 'go', 'field' => 'next', 'body' => 'Una nota', 'at' => SnapshotWorld::CLOCK_ISO, 'revision' => 40]],
        ],
        'preferences' => null,
    ]);
});

it('answers the empty snapshot to an account without a head, without writing one', function () {
    SnapshotWorld::seedContent();

    $response = $this->browser->get('/api/progress');

    $response->assertOk()->assertJsonPath('epoch', 1)->assertJsonPath('revision', 0)->assertJsonPath('resetAt', null);
    expect(DB::table('progress_heads')->count())->toBe(0);
});

it('answers the validator and a private no-store cache', function () {
    SnapshotWorld::seedContent();
    ProgressWorld::head($this->user, 3, 12);

    $response = $this->browser->get('/api/progress');

    expect($response->headers->get('ETag'))->toBe("W/\"u{$this->user->id}.e3.r12.c".SnapshotWorld::CONTENT_VERSION.'"')
        ->and($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
        ->and($response->headers->getCacheControlDirective('private'))->toBeTrue();
});

it('answers 304 without a body and with the same headers when If-None-Match is the validator', function (callable $header) {
    SnapshotWorld::seedContent();
    ProgressWorld::head($this->user, 1, 5);
    $etag = $this->browser->get('/api/progress')->headers->get('ETag');

    $response = $this->browser->withHeader('If-None-Match', $header($etag))->get('/api/progress');

    $response->assertStatus(304);
    expect($response->getContent())->toBe('')
        ->and($response->headers->get('ETag'))->toBe($etag)
        ->and($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
        ->and($response->headers->getCacheControlDirective('private'))->toBeTrue();
})->with([
    'as the response gave it, weak' => [fn (string $etag) => $etag],
    'strong' => [fn (string $etag) => etagWithoutWeakPrefix($etag)],
    'in a list' => [fn (string $etag) => '"other", '.$etag],
]);

it('answers 200 when If-None-Match is the validator of another revision', function () {
    SnapshotWorld::seedContent();
    ProgressWorld::head($this->user, 1, 5);
    $etag = $this->browser->get('/api/progress')->headers->get('ETag');
    (new AccountLock)->within($this->user->id, fn ($head) => (new AccountLock)->advance($head, Instant::now()));

    $response = $this->browser->withHeader('If-None-Match', $etag)->get('/api/progress');

    $response->assertOk()->assertJsonPath('revision', 6);
    expect($response->headers->get('ETag'))->not->toBe($etag);
});

it('answers 200 when the content version changed after the validator was given', function () {
    SnapshotWorld::seedContent();
    $etag = $this->browser->get('/api/progress')->headers->get('ETag');
    DB::table('content_imports')->insert([
        'document_hash' => 'fedcba9876543210fedcba9876543210'.str_repeat('0', 32), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => SnapshotWorld::CLOCK,
    ]);

    $this->browser->withHeader('If-None-Match', $etag)->get('/api/progress')->assertOk()->assertJsonPath('contentVersion', 'fedcba9876543210fedcba9876543210');
});

it('takes the account from the session and ignores a user_id in the query', function () {
    SnapshotWorld::seedContent();
    $other = ProgressWorld::user();
    SnapshotWorld::exerciseProgress($other, 'fx-rust-01', ['attempt_count' => 9]);
    SnapshotWorld::exerciseProgress($this->user, 'fx-rust-02', ['attempt_count' => 1]);

    $response = $this->browser->get("/api/progress?user_id={$other->id}");

    $response->assertOk()->assertJsonPath('userId', $this->user->id);
    expect(array_column($response->json('exercises'), 'exerciseId'))->toBe(['fx-rust-02']);
});

it('needs no X-Taller-User header to read', function () {
    SnapshotWorld::seedContent();

    $this->browser->withoutAccountHeader()->get('/api/progress')->assertOk();
});
