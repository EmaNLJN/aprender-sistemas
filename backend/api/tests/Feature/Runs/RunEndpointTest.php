<?php

use App\Models\User;
use App\Runs\Record\Instant;
use App\Runs\RunLimiters;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

const SUBMIT_CLIENT_RUN_ID = '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21';

beforeEach(function () {
    $this->travelTo(Instant::parse('2026-10-05 12:00:00.000'));
    RunLimiters::register();
    RunWorld::exercise();
    $this->user = RunWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

/** @param array<string, mixed> $overrides */
function submitBody(array $overrides = []): array
{
    return ['clientRunId' => SUBMIT_CLIENT_RUN_ID, 'exerciseId' => 'rust-01', 'code' => 'fn main() {}', ...$overrides];
}

function assertPrivateNoStore($response): void
{
    expect($response->headers->getCacheControlDirective('private'))->toBeTrue()
        ->and($response->headers->getCacheControlDirective('no-store'))->toBeTrue();
}

describe('accepts', function () {
    it('answers 202 with the queued run, its position and the rest still empty', function () {
        $response = $this->browser->post('/api/runs', submitBody());

        $response->assertStatus(202);
        $data = $response->json('data');
        expect($data['status'])->toBe('queued')
            ->and($data['queuePosition'])->toBe(1)
            ->and($data['exerciseId'])->toBe('rust-01')
            ->and($data['language'])->toBe('rust')
            ->and($data['createdAt'])->toBe('2026-10-05T12:00:00.000Z')
            ->and($data['tests'])->toBe([])
            ->and([$data['reason'], $data['startedAt'], $data['finishedAt'], $data['phase'], $data['exitCode'], $data['stdout'], $data['customTest']])->each->toBeNull();
        assertPrivateNoStore($response);
        expect(DB::table('runs')->count())->toBe(1)
            ->and(DB::table('jobs')->count())->toBe(1);
    });

    it('answers 200 with the current state to a retry', function () {
        $first = $this->browser->post('/api/runs', submitBody());

        $again = $this->browser->post('/api/runs', submitBody());

        $again->assertOk();
        expect($again->json('data.id'))->toBe($first->json('data.id'))
            ->and(DB::table('jobs')->count())->toBe(1);
        assertPrivateNoStore($again);
    });

    it('takes the account from the session and ignores any other id', function () {
        $other = RunWorld::user();

        $this->browser->post('/api/runs', submitBody())->assertStatus(202);

        expect(DB::table('runs')->value('user_id'))->toBe($this->user->id)
            ->and(DB::table('runs')->where('user_id', $other->id)->count())->toBe(0);
    });

    it('stores a client run id with capitals in lower case', function () {
        $response = $this->browser->post('/api/runs', submitBody(['clientRunId' => strtoupper(SUBMIT_CLIENT_RUN_ID)]));

        $response->assertStatus(202);
        expect(DB::table('runs')->value('client_run_id'))->toBe(SUBMIT_CLIENT_RUN_ID);
    });
});

describe('validates', function () {
    it('answers 422 validation_failed with the errors by field', function (array $body, string $field) {
        $response = $this->browser->post('/api/runs', $body);

        $response->assertStatus(422)->assertJsonPath('code', 'validation_failed')->assertJsonStructure(['message', 'code', 'errors' => [$field]]);
        assertPrivateNoStore($response);
        expect(DB::table('runs')->count())->toBe(0)
            ->and(DB::table('jobs')->count())->toBe(0);
    })->with([
        'missing client run id' => [['exerciseId' => 'rust-01', 'code' => 'x'], 'clientRunId'],
        'missing exercise' => [['clientRunId' => SUBMIT_CLIENT_RUN_ID, 'code' => 'x'], 'exerciseId'],
        'missing code' => [['clientRunId' => SUBMIT_CLIENT_RUN_ID, 'exerciseId' => 'rust-01'], 'code'],
        'code is a number' => [submitBody(['code' => 12]), 'code'],
        'exercise is a list' => [submitBody(['exerciseId' => ['rust-01']]), 'exerciseId'],
        'client run id is not a uuid' => [submitBody(['clientRunId' => 'not-a-uuid']), 'clientRunId'],
        'empty code' => [submitBody(['code' => '']), 'code'],
        'blank code' => [submitBody(['code' => " \t\r\n "]), 'code'],
        '65537 bytes of code' => [submitBody(['code' => str_repeat('a', 65537)]), 'code'],
        '32769 two-byte characters of code' => [submitBody(['code' => str_repeat('ñ', 32769)]), 'code'],
        '3001 characters of custom test' => [submitBody(['customTest' => str_repeat('a', 3001)]), 'customTest'],
        'custom test is a number' => [submitBody(['customTest' => 5]), 'customTest'],
        'unknown exercise' => [submitBody(['exerciseId' => 'rust-99']), 'exerciseId'],
        'malformed exercise' => [submitBody(['exerciseId' => 'RUST 01']), 'exerciseId'],
    ]);

    it('rejects a field that the server decides, one at a time', function (string $field, mixed $value) {
        $response = $this->browser->post('/api/runs', submitBody([$field => $value]));

        $response->assertStatus(422)->assertJsonStructure(['errors' => [$field]]);
        expect($response->json("errors.{$field}.0"))->toBe("Sobra el campo {$field}.")
            ->and(DB::table('runs')->count())->toBe(0);
    })->with([['language', 'go'], ['tests', ['t1']], ['program', 'fn main() {}'], ['userId', 99]]);

    it('rejects a retired exercise', function () {
        DB::table('exercises')->where('id', 'rust-01')->update(['status' => 'deprecated', 'retired_at' => now(), 'position' => null]);

        $this->browser->post('/api/runs', submitBody())->assertStatus(422)->assertJsonStructure(['errors' => ['exerciseId']]);
    });

    it('accepts 65536 bytes of code and 3000 characters of custom test of two bytes each', function () {
        $this->browser->post('/api/runs', submitBody(['code' => str_repeat('a', 65536)]))->assertStatus(202);
        DB::table('runs')->update(['status' => 'passed', 'program' => null, 'finished_at' => now(), 'expires_at' => null]);

        $this->browser->post('/api/runs', submitBody(['clientRunId' => '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f23', 'customTest' => str_repeat('ñ', 3000)]))->assertStatus(202);
    });
});

describe('rejects', function () {
    it('a client run id used with another code with 422 client_run_id_reused', function () {
        $this->browser->post('/api/runs', submitBody());

        $response = $this->browser->post('/api/runs', submitBody(['code' => 'fn main() { }']));

        $response->assertStatus(422)->assertExactJson([
            'message' => 'Ese identificador de ejecución ya se usó con otro código, otro ejercicio u otra prueba propia.',
            'code' => 'client_run_id_reused',
        ]);
        assertPrivateNoStore($response);
    });

    it('a run past a quota with 429 quota_exceeded, its message and a whole Retry-After', function (string $quota, string $message, Closure $reachQuota) {
        $reachQuota($this->user);

        $response = $this->browser->post('/api/runs', submitBody());

        $response->assertStatus(429)->assertJsonPath('code', 'quota_exceeded')->assertJsonPath('quota', $quota)->assertJsonPath('message', $message);
        expect($response->headers->get('Retry-After'))->toMatch('/\A[1-9][0-9]*\z/');
        assertPrivateNoStore($response);
        expect(DB::table('runs')->where('client_run_id', SUBMIT_CLIENT_RUN_ID)->count())->toBe(0)
            ->and(DB::table('jobs')->count())->toBe(0);
    })->with([
        'active' => ['active', 'Ya tenés una ejecución en curso: esperá a que termine.', function (User $user) {
            RunWorld::run($user, ['status' => 'running', 'started_at' => Instant::now()]);
        }],
        'per minute' => ['per_minute', 'Hiciste demasiadas ejecuciones en el último minuto: esperá un momento.', function (User $user) {
            config(['runs.quota.per_minute' => 1]);
            RunWorld::run($user, ['status' => 'failed', 'finished_at' => Instant::now()->subSeconds(5), 'created_at' => Instant::now()->subSeconds(10)]);
        }],
        'per day' => ['per_day', 'Llegaste al máximo de ejecuciones de las últimas 24 horas.', function (User $user) {
            config(['runs.quota.per_day' => 1]);
            RunWorld::run($user, ['status' => 'failed', 'finished_at' => Instant::now()->subHours(2), 'created_at' => Instant::now()->subHours(3)]);
        }],
        'sandbox time' => ['sandbox_time', 'Llegaste al máximo de tiempo de ejecución de las últimas 24 horas.', function (User $user) {
            config(['runs.quota.sandbox_minutes_per_day' => 1]);
            RunWorld::run($user, ['status' => 'failed', 'finished_at' => Instant::now()->subHours(2), 'created_at' => Instant::now()->subHours(3), 'compile_ms' => 40_000, 'run_ms' => 20_000]);
        }],
    ]);

    it('a full queue with 503 queue_full and Retry-After 10', function () {
        config(['runs.queue.max_waiting' => 1]);
        RunWorld::run(RunWorld::user(), ['status' => 'queued']);

        $response = $this->browser->post('/api/runs', submitBody());

        $response->assertStatus(503)->assertExactJson([
            'message' => 'El taller está ocupado ahora mismo: reintentá en unos segundos.',
            'code' => 'queue_full',
        ]);
        expect($response->headers->get('Retry-After'))->toBe('10');
        assertPrivateNoStore($response);
        expect(DB::table('runs')->where('user_id', $this->user->id)->count())->toBe(0);
    });

    it('a retry from a disabled account with 403 account_disabled', function () {
        $this->browser->post('/api/runs', submitBody())->assertStatus(202);
        DB::table('users')->where('id', $this->user->id)->update(['status' => 'disabled']);

        $this->browser->post('/api/runs', submitBody())->assertForbidden()->assertJsonPath('code', 'account_disabled');
        expect(DB::table('runs')->count())->toBe(1);
    });

    it('does not let a retry fail for a quota or for a full queue', function () {
        $this->browser->post('/api/runs', submitBody())->assertStatus(202);
        config(['runs.queue.max_waiting' => 1, 'runs.quota.per_minute' => 1]);

        $this->browser->post('/api/runs', submitBody())->assertOk();
    });
});

describe('never shows the program', function () {
    it('in the response, also on a retry', function () {
        $accepted = $this->browser->post('/api/runs', submitBody(['code' => 'fn main() {} // TALLER_CENTINELA_X']));
        $retry = $this->browser->post('/api/runs', submitBody(['code' => 'fn main() {} // TALLER_CENTINELA_X']));

        $program = (string) DB::table('runs')->value('program');
        expect($program)->toContain('TALLER_CENTINELA_X')
            ->and($accepted->getContent())->not->toContain('TALLER_CENTINELA_X')
            ->and($accepted->getContent())->not->toContain('__TALLER_END__')
            ->and($retry->getContent())->not->toContain('TALLER_CENTINELA_X');
    });
});
