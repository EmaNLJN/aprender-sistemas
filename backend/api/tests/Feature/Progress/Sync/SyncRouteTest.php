<?php

use App\Http\ProgressLimiters;
use App\Models\User;
use App\Progress\ChangesReader;
use App\Progress\Operations\OperationProcessor;
use App\Progress\Operations\RejectionReason;
use App\Progress\ProgressAreas;
use App\Runs\Record\Instant;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\FakeChangesReader;
use Tests\Support\Sync\FakeOperationProcessor;

const ROUTE_VERSION = '0123456789abcdef0123456789abcdef';

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-06 12:00:00.123'));
    ProgressLimiters::register();
    Route::prefix('api')->middleware('api')->group(base_path('routes/api/sync.php'));
    $this->processor = new FakeOperationProcessor;
    $this->reader = new FakeChangesReader;
    app()->instance(OperationProcessor::class, $this->processor);
    app()->instance(ChangesReader::class, $this->reader);
    DB::table('content_imports')->insert([
        'document_hash' => ROUTE_VERSION.str_repeat('0', 32), 'portion_hashes' => '{}', 'counts' => '{}', 'changes' => '{}', 'created_at' => '2026-10-01 00:00:00.000',
    ]);
    $this->user = ProgressWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

/** @return array<string, mixed> */
function routeOperation(int $number = 1, string $text = 'Hola'): array
{
    return [
        'id' => sprintf('00000000-0000-4000-8000-%012d', $number), 'type' => 'exercise.reflection',
        'at' => '2026-10-06T11:59:58.000Z', 'exerciseId' => 'fx-rust-01', 'text' => $text,
    ];
}

/** @return array<string, mixed> */
function routeEnvelope(): array
{
    return [
        'epoch' => 1, 'sentAt' => '2026-10-06T12:00:00.123Z', 'knownRevision' => 0, 'knownContentVersion' => ROUTE_VERSION,
        'format' => 2, 'operations' => [routeOperation()],
    ];
}

function routePostRaw(Browser $browser, int $accountId, string $content): TestResponse
{
    Auth::forgetGuards();
    app()->forgetInstance('auth.driver');
    app('session')->forgetDrivers();
    app()->forgetInstance('session.store');
    app('cookie')->flushQueuedCookies();
    $cookies = [];
    foreach ([config('session.cookie'), 'XSRF-TOKEN'] as $name) {
        $value = $browser->cookie($name);
        if ($value !== null) {
            $cookies[$name] = $value;
        }
    }

    return test()->call('POST', '/api/sync', [], $cookies, [], [
        'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json', 'HTTP_X_TALLER_USER' => (string) $accountId, 'REMOTE_ADDR' => '127.0.0.1',
    ], $content);
}

describe('the response', function () {
    it('answers 200 with the outcome of http.md section 3.4 and no-store', function () {
        $response = $this->browser->post('/api/sync', routeEnvelope());

        $response->assertOk()->assertExactJson([
            'epoch' => 1,
            'revision' => 1,
            'serverTime' => '2026-10-06T12:00:00.123Z',
            'contentVersion' => ROUTE_VERSION,
            'results' => [['id' => '00000000-0000-4000-8000-000000000001', 'status' => 'applied']],
            'changes' => [
                'full' => true,
                'exercises' => [], 'drafts' => [], 'campaign' => ['seals' => [], 'checkpoints' => []],
                'workshops' => ['progress' => [], 'objectives' => [], 'steps' => []],
                'route' => ['marks' => [], 'quiz' => [], 'notes' => []], 'preferences' => null,
            ],
        ]);
        expect($response->headers->getCacheControlDirective('no-store'))->toBeTrue();
    });

    it('answers the reason of a rejected operation and the changes the reader returned', function () {
        $this->processor->rejectOnCheck = ['00000000-0000-4000-8000-000000000001' => RejectionReason::UnknownReference];
        $this->reader->areas = new ProgressAreas(routeNotes: [['language' => 'rust', 'field' => 'learned']]);

        $response = $this->browser->post('/api/sync', routeEnvelope());

        $response->assertOk()
            ->assertJsonPath('results.0', ['id' => '00000000-0000-4000-8000-000000000001', 'status' => 'rejected', 'reason' => 'unknown_reference'])
            ->assertJsonPath('changes.route.notes', [['language' => 'rust', 'field' => 'learned']]);
    });

    it('answers 200 with no results to a batch with no operations', function () {
        $response = $this->browser->post('/api/sync', ['operations' => []] + routeEnvelope());

        $response->assertOk()->assertJsonPath('results', []);
        expect(DB::table('sync_operations')->count())->toBe(0);
    });

    it('takes a missing knownRevision as 0', function () {
        ProgressWorld::head($this->user, revision: 5);
        $body = routeEnvelope();
        unset($body['knownRevision']);

        $this->browser->post('/api/sync', $body)->assertOk()->assertJsonPath('changes.full', true);

        expect($this->reader->calls[0]['sinceRevision'])->toBeNull();
    });

    it('passes the known revision on to the service', function () {
        ProgressWorld::head($this->user, revision: 5);

        $this->browser->post('/api/sync', ['knownRevision' => 4] + routeEnvelope())->assertOk()->assertJsonPath('changes.full', false);

        expect($this->reader->calls[0]['sinceRevision'])->toBe(4);
    });

    it('syncs the account of the session and ignores a user_id in the body', function () {
        $other = ProgressWorld::user();

        $this->browser->post('/api/sync', ['user_id' => $other->id, 'userId' => $other->id] + routeEnvelope())->assertOk();

        expect(DB::table('sync_operations')->pluck('user_id')->all())->toBe([$this->user->id])
            ->and(DB::table('progress_heads')->where('user_id', $other->id)->exists())->toBeFalse();
    });

    it('hands the operations to the service as they arrived, with the fields they brought', function () {
        $operation = routeOperation(1, 'Texto con ñ y 😀');

        $this->browser->post('/api/sync', ['operations' => [$operation]] + routeEnvelope())->assertOk();

        expect($this->processor->decodedBatches)->toBe([['00000000-0000-4000-8000-000000000001']])
            ->and(DB::table('sync_operations')->value('payload_sha256'))->toBe(hex2bin(hash('sha256', '{"at":"2026-10-06T11:59:58.000Z","exerciseId":"fx-rust-01","text":"Texto con ñ y 😀","type":"exercise.reflection"}')));
    });
});

describe('the envelope', function () {
    it('answers 422 validation_failed with the errors by field and writes nothing', function (Closure $break, string $field) {
        $response = $this->browser->post('/api/sync', $break(routeEnvelope()));

        $response->assertStatus(422)->assertJsonPath('code', 'validation_failed');
        expect(array_keys($response->json('errors')))->toContain($field)
            ->and($this->processor->decodedBatches)->toBe([])
            ->and(DB::table('progress_heads')->count())->toBe(0)
            ->and(DB::table('sync_operations')->count())->toBe(0);
    })->with([
        'no epoch' => [fn (array $body) => array_diff_key($body, ['epoch' => 1]), 'epoch'],
        'epoch 0' => [fn (array $body) => ['epoch' => 0] + $body, 'epoch'],
        'epoch as text' => [fn (array $body) => ['epoch' => '1'] + $body, 'epoch'],
        'epoch as decimal' => [fn (array $body) => ['epoch' => 1.5] + $body, 'epoch'],
        'no sentAt' => [fn (array $body) => array_diff_key($body, ['sentAt' => 1]), 'sentAt'],
        'sentAt without the Z' => [fn (array $body) => ['sentAt' => '2026-10-06T12:00:00.123'] + $body, 'sentAt'],
        'sentAt without milliseconds' => [fn (array $body) => ['sentAt' => '2026-10-06T12:00:00Z'] + $body, 'sentAt'],
        'sentAt with a space' => [fn (array $body) => ['sentAt' => '2026-10-06 12:00:00.123'] + $body, 'sentAt'],
        'sentAt that does not exist' => [fn (array $body) => ['sentAt' => '2026-13-45T25:61:61.000Z'] + $body, 'sentAt'],
        'sentAt as a number' => [fn (array $body) => ['sentAt' => 1791288000123] + $body, 'sentAt'],
        'negative knownRevision' => [fn (array $body) => ['knownRevision' => -1] + $body, 'knownRevision'],
        'knownRevision as text' => [fn (array $body) => ['knownRevision' => '4'] + $body, 'knownRevision'],
        'null knownRevision' => [fn (array $body) => ['knownRevision' => null] + $body, 'knownRevision'],
        'knownContentVersion in capitals' => [fn (array $body) => ['knownContentVersion' => strtoupper(ROUTE_VERSION)] + $body, 'knownContentVersion'],
        'knownContentVersion too short' => [fn (array $body) => ['knownContentVersion' => 'abc123'] + $body, 'knownContentVersion'],
        'knownContentVersion as a number' => [fn (array $body) => ['knownContentVersion' => 12345] + $body, 'knownContentVersion'],
        'no format' => [fn (array $body) => array_diff_key($body, ['format' => 1]), 'format'],
        'format as text' => [fn (array $body) => ['format' => '2'] + $body, 'format'],
        'no operations' => [fn (array $body) => array_diff_key($body, ['operations' => 1]), 'operations'],
        'operations as text' => [fn (array $body) => ['operations' => 'nope'] + $body, 'operations'],
        'operations as an object' => [fn (array $body) => ['operations' => ['a' => routeOperation()]] + $body, 'operations'],
        '201 operations' => [fn (array $body) => ['operations' => array_map(fn (int $number) => routeOperation($number), range(1, 201))] + $body, 'operations'],
        'an operation that is not an object' => [fn (array $body) => ['operations' => [routeOperation(1), 'x']] + $body, 'operations.1'],
        'an operation without id' => [fn (array $body) => ['operations' => [routeOperation(1), array_diff_key(routeOperation(2), ['id' => 1])]] + $body, 'operations.1.id'],
        'an id that is not a uuid' => [fn (array $body) => ['operations' => [['id' => 'not-a-uuid'] + routeOperation()]] + $body, 'operations.0.id'],
        'a uuid in capitals' => [fn (array $body) => ['operations' => [['id' => '0199F4A2-8E03-4C5A-B3D1-9A77C0DE4F21'] + routeOperation()]] + $body, 'operations.0.id'],
        'a uuid that is not v4' => [fn (array $body) => ['operations' => [['id' => '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21'] + routeOperation()]] + $body, 'operations.0.id'],
        'a uuid with the wrong variant' => [fn (array $body) => ['operations' => [['id' => '0199f4a2-8e03-4c5a-c3d1-9a77c0de4f21'] + routeOperation()]] + $body, 'operations.0.id'],
        'an id as a number' => [fn (array $body) => ['operations' => [['id' => 7] + routeOperation()]] + $body, 'operations.0.id'],
        'an operation without type' => [fn (array $body) => ['operations' => [array_diff_key(routeOperation(), ['type' => 1])]] + $body, 'operations.0.type'],
        'a type that is not text' => [fn (array $body) => ['operations' => [['type' => 5] + routeOperation()]] + $body, 'operations.0.type'],
        'an operation without at' => [fn (array $body) => ['operations' => [array_diff_key(routeOperation(), ['at' => 1])]] + $body, 'operations.0.at'],
        'an at with another shape' => [fn (array $body) => ['operations' => [['at' => '2026-10-06T11:59:58Z'] + routeOperation()]] + $body, 'operations.0.at'],
    ]);

    it('accepts exactly 200 operations', function () {
        $operations = array_map(fn (int $number) => routeOperation($number), range(1, 200));

        $this->browser->post('/api/sync', ['operations' => $operations] + routeEnvelope())->assertOk();

        expect(DB::table('sync_operations')->count())->toBe(200);
    });

    it('takes the operation limit from the configuration', function () {
        config(['progress.sync.max_operations' => 1]);

        $this->browser->post('/api/sync', ['operations' => [routeOperation(1), routeOperation(2)]] + routeEnvelope())->assertStatus(422);
    });

    it('answers 422 to a body that is not a JSON object, is not JSON, or holds a lone surrogate', function (string $content) {
        $response = routePostRaw($this->browser, $this->user->id, $content);

        $response->assertStatus(422)->assertJsonPath('code', 'validation_failed');
        expect($this->processor->decodedBatches)->toBe([]);
    })->with([
        'a list' => ['[1, 2]'],
        'a number' => ['5'],
        'text that is not JSON' => ['{"epoch": '],
        'a lone surrogate' => ['{"epoch": 1, "sentAt": "2026-10-06T12:00:00.123Z", "format": 2, "operations": [{"id": "00000000-0000-4000-8000-000000000001", "type": "exercise.reflection", "at": "2026-10-06T11:59:58.000Z", "exerciseId": "fx-rust-01", "text": "\ud800"}]}'],
    ]);
});

describe('access', function () {
    it('answers 401 unauthenticated without a session', function () {
        Browser::for($this)->useDatabaseDrivers()->post('/api/sync', routeEnvelope())->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');

        expect($this->processor->decodedBatches)->toBe([]);
    });

    it('answers 409 account_mismatch with the header of another account or without it', function (string $header) {
        $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
        $browser = $header === 'missing' ? $browser->withoutAccountHeader() : $browser->withAccountHeader((string) ProgressWorld::user()->id);

        $browser->post('/api/sync', routeEnvelope())->assertStatus(409)->assertJsonPath('code', 'account_mismatch');

        expect($this->processor->decodedBatches)->toBe([]);
    })->with(['another account', 'missing']);

    it('answers 403 email_unverified when the email is not verified', function () {
        $browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::factory()->unverified()->create());

        $browser->post('/api/sync', routeEnvelope())->assertForbidden()->assertJsonPath('code', 'email_unverified');
    });

    it('answers 403 account_disabled when the account is disabled', function () {
        DB::table('users')->where('id', $this->user->id)->update(['status' => 'disabled']);

        $this->browser->post('/api/sync', routeEnvelope())->assertForbidden()->assertJsonPath('code', 'account_disabled');

        expect($this->processor->decodedBatches)->toBe([]);
    });

    it('answers 419 without the CSRF token', function () {
        $browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user)->enforceCsrf()->forget('XSRF-TOKEN');

        $browser->post('/api/sync', routeEnvelope())->assertStatus(419)->assertJsonPath('code', 'csrf_token_mismatch');
    });
});

describe('the errors of the service', function () {
    it('answers 409 epoch_mismatch with the current epoch and revision, in Spanish and no-store', function () {
        ProgressWorld::head($this->user, epoch: 3, revision: 7);

        $response = $this->browser->post('/api/sync', routeEnvelope());

        $response->assertStatus(409)->assertExactJson([
            'message' => 'Tu progreso se borró desde otro dispositivo. Se cargará el estado nuevo.',
            'code' => 'epoch_mismatch',
            'epoch' => 3,
            'revision' => 7,
        ]);
        expect($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
            ->and(DB::table('sync_operations')->count())->toBe(0);
    });

    it('answers 409 client_outdated for a format the server does not accept', function (int $format) {
        $response = $this->browser->post('/api/sync', ['format' => $format] + routeEnvelope());

        $response->assertStatus(409)->assertExactJson([
            'message' => 'Esta pestaña quedó vieja. Recargá la página para seguir sincronizando.',
            'code' => 'client_outdated',
        ]);
        expect($response->headers->getCacheControlDirective('no-store'))->toBeTrue()
            ->and($this->processor->decodedBatches)->toBe([]);
    })->with([1, 3, 0, -4]);

    it('answers 503 content_not_imported with Retry-After when there is no import', function () {
        DB::table('content_imports')->delete();

        $response = $this->browser->post('/api/sync', routeEnvelope());

        $response->assertStatus(503)->assertJsonPath('code', 'content_not_imported');
        expect($response->headers->get('Retry-After'))->toBe('60');
    });

    it('answers 500 server_error without the text of the student when the database rejects the write', function () {
        $this->processor->failNextApplyWith(new QueryException('mysql', 'insert into `drafts` (`code`) values (?)', ['sentinel-text-1'], new PDOException('Incorrect string value')));

        $response = $this->browser->post('/api/sync', routeEnvelope());

        $response->assertStatus(500)->assertJsonPath('code', 'server_error');
        expect($response->getContent())->not->toContain('sentinel-text-1')->not->toContain('drafts');
    });
});

describe('the limit', function () {
    function routeInvalidPost(Browser $browser): TestResponse
    {
        return $browser->post('/api/sync', ['epoch' => 0]);
    }

    it('answers 429 too_many_requests with Retry-After to the 61st post in a minute, rejected ones included', function () {
        foreach (range(1, 60) as $post) {
            routeInvalidPost($this->browser)->assertStatus(422);
        }

        $response = routeInvalidPost($this->browser);

        $response->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
        expect((int) $response->headers->get('Retry-After'))->toBeGreaterThanOrEqual(1);
    });

    it('gives every account its own count', function () {
        foreach (range(1, 61) as $post) {
            routeInvalidPost($this->browser);
        }
        $other = Browser::for($this)->useDatabaseDrivers()->signIn(ProgressWorld::user());

        routeInvalidPost($other)->assertStatus(422);
    });

    it('takes the limit from the configuration', function () {
        config(['progress.sync.throttle_per_minute' => 2]);

        routeInvalidPost($this->browser)->assertStatus(422);
        routeInvalidPost($this->browser)->assertStatus(422);
        routeInvalidPost($this->browser)->assertStatus(429);
    });
});
