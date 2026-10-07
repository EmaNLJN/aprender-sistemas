<?php

use App\Auth\EmailFingerprint;
use App\Auth\Invitations;
use App\Auth\Limiters;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter as RateLimiterFacade;
use Illuminate\Support\Sleep;
use Monolog\Handler\TestHandler;
use Monolog\LogRecord;
use Tests\Support\Browser;

const WRONG_PASSWORD = 'wrong-password-9921';
const VALID_PASSWORD = 'correct horse battery';
const INVITED_PASSWORD = 'x7Kp2mQ9vL4tZ8w';

beforeEach(function () {
    useSampleBlockedPasswords();
    Sleep::fake();
    Carbon::setTestNow('2030-01-01 12:00:00');
    RateLimiterFacade::swap(new RateLimiter(Cache::store()));
    Limiters::register();

    config(['logging.default' => 'stderr']);
    $this->handler = new TestHandler;
    Log::channel('stderr')->getLogger()->setHandlers([$this->handler]);

    $this->sessionIds = [];
    $this->visit = function (Browser $browser, string $uri, array $body = []) {
        $response = $browser->post($uri, $body);
        $this->sessionIds[] = request()->session()->getId();

        return $response;
    };
});

afterEach(fn () => Carbon::setTestNow());

/** @return list<string> every record as the JSON line that goes to stderr, with the processors applied */
function renderedRecords(TestHandler $handler): array
{
    return array_map(
        fn (LogRecord $record) => json_encode([$record->message, $record->context, $record->extra], JSON_THROW_ON_ERROR),
        $handler->getRecords(),
    );
}

function runLoginsAndAnAcceptance(object $test): array
{
    $beto = User::factory()->withPassword(VALID_PASSWORD)->create(['email' => 'beto@x.com']);
    User::factory()->withPassword(VALID_PASSWORD)->create(['email' => 'ana@x.com']);
    $issued = app(Invitations::class)->issue('nueva@x.com', Role::Student, null);

    $login = Browser::for($test)->useDatabaseDrivers();
    ($test->visit)($login, '/api/auth/login', ['email' => 'beto@x.com', 'password' => VALID_PASSWORD])->assertOk();

    foreach (range(1, 10) as $attempt) {
        $failing = Browser::for($test)->useDatabaseDrivers()->fromIp("10.0.0.{$attempt}");
        ($test->visit)($failing, '/api/auth/login', ['email' => 'ana@x.com', 'password' => WRONG_PASSWORD])->assertStatus(422);
    }

    $invited = Browser::for($test)->useDatabaseDrivers();
    ($test->visit)($invited, '/api/auth/invitations/accept', [
        'token' => $issued->token,
        'name' => 'Nueva Cuenta',
        'password' => INVITED_PASSWORD,
        'password_confirmation' => INVITED_PASSWORD,
        'privacyVersion' => config()->string('taller.privacy_version'),
    ])->assertCreated();

    $failingSessionId = request()->session()->getId();
    $error = new QueryException('mysql', 'select * from `sessions` where `id` = ? and `email` = ?', [$failingSessionId, 'ana@x.com'], new PDOException('boom'));
    Log::error('Falló la consulta', ['exception' => $error]);

    return ['token' => $issued->token, 'betoId' => $beto->id];
}

it('keeps the passwords, the invitation token and the session ids out of every record', function () {
    $run = runLoginsAndAnAcceptance($this);

    $lines = renderedRecords($this->handler);

    expect($lines)->not->toBe([]);
    foreach ([WRONG_PASSWORD, VALID_PASSWORD, INVITED_PASSWORD, $run['token'], ...$this->sessionIds] as $secret) {
        expect(collect($lines)->filter(fn (string $line) => str_contains($line, $secret))->all())->toBe([]);
    }
});

it('shows an email only as email:<hmac>', function () {
    runLoginsAndAnAcceptance($this);

    $lines = implode("\n", renderedRecords($this->handler));

    expect($lines)->not->toContain('ana@x.com')->not->toContain('beto@x.com')->not->toContain('nueva@x.com')
        ->toContain('email:'.EmailFingerprint::of('ana@x.com'));
});

it('records the acceptance with a null inviter and the id of the new account', function () {
    runLoginsAndAnAcceptance($this);

    $accepted = collect($this->handler->getRecords())->first(fn (LogRecord $record) => $record->message === 'invitation.accepted');
    $newAccount = User::where('email', 'nueva@x.com')->firstOrFail();

    expect($accepted)->not->toBeNull()
        ->and($accepted->context)->toBe(['invited_by' => null, 'user_id' => $newAccount->id]);
});

it('records the account lockout step with the email HMAC, the IP and the request id', function () {
    runLoginsAndAnAcceptance($this);

    $hmac = EmailFingerprint::of('ana@x.com');
    $lockoutRecords = collect($this->handler->getRecords())->filter(fn (LogRecord $record) => str_contains(json_encode([$record->message, $record->context]), "email:{$hmac}")
        && $record->message !== 'Falló la consulta');

    expect($lockoutRecords)->not->toBeEmpty();
    $step = $lockoutRecords->first();
    expect($step->extra['ip'])->toBeString()->not->toBe('')
        ->and($step->extra['request_id'])->toMatch('/^[0-9a-f]{32}$/');
});
