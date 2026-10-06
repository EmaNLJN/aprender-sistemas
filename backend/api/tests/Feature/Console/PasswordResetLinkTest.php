<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

beforeEach(fn () => Carbon::setTestNow('2026-10-05 12:00:00'));

afterEach(fn () => Carbon::setTestNow());

/** @return array{int, string} */
function runResetLink(string $email): array
{
    $exit = Artisan::call('taller:password-reset-link', ['email' => $email]);

    return [$exit, Artisan::output()];
}

function resetLinkIn(string $output): ?string
{
    foreach (explode("\n", $output) as $line) {
        if (preg_match('#^https?://.+/\#restablecer=[A-Za-z0-9]+&email=.+$#', $line) === 1) {
            return $line;
        }
    }

    return null;
}

it('prints the link of an active account on its own line, with the email encoded', function () {
    User::factory()->create(['email' => 'ana@x.com']);

    [$exit, $output] = runResetLink('ana@x.com');

    expect($exit)->toBe(0)
        ->and(resetLinkIn($output))->toMatch('#^'.preg_quote(config()->string('app.url'), '#').'/\#restablecer=[A-Za-z0-9]+&email=ana%40x\.com$#')
        ->and($output)->toContain('60 minutos');
});

it('serves an admin too', function () {
    User::factory()->admin()->create(['email' => 'root@x.com']);

    [$exit, $output] = runResetLink('root@x.com');

    expect($exit)->toBe(0)->and(resetLinkIn($output))->not->toBeNull();
});

it('stores a bcrypt hash of the token and never the token', function () {
    User::factory()->create(['email' => 'ana@x.com']);

    [, $output] = runResetLink('ana@x.com');

    preg_match('/restablecer=([A-Za-z0-9]+)&/', (string) resetLinkIn($output), $found);
    $stored = (string) DB::table('password_reset_tokens')->where('email', 'ana@x.com')->value('token');
    expect($stored)->not->toContain($found[1])
        ->and(password_get_info($stored)['algoName'])->toBe('bcrypt')
        ->and(Hash::check($found[1], $stored))->toBeTrue();
});

it('does not issue another link within sixty seconds and says how many are left', function () {
    User::factory()->create(['email' => 'ana@x.com']);
    runResetLink('ana@x.com');
    Carbon::setTestNow('2026-10-05 12:00:10');

    [$exit, $output] = runResetLink('ana@x.com');

    expect($exit)->toBe(1)
        ->and($output)->toContain('50 segundos')
        ->and(resetLinkIn($output))->toBeNull();
});

it('issues another link after sixty-one seconds and replaces the previous token', function () {
    User::factory()->create(['email' => 'ana@x.com']);
    [, $first] = runResetLink('ana@x.com');
    Carbon::setTestNow('2026-10-05 12:01:01');

    [$exit, $second] = runResetLink('ana@x.com');

    expect($exit)->toBe(0)
        ->and(resetLinkIn($second))->not->toBe(resetLinkIn($first))
        ->and(DB::table('password_reset_tokens')->count())->toBe(1);
});

it('refuses an email without an account', function () {
    [$exit, $output] = runResetLink('nobody@x.com');

    expect($exit)->toBe(1)
        ->and($output)->toContain('No hay una cuenta')
        ->and(DB::table('password_reset_tokens')->count())->toBe(0);
});

it('refuses a disabled account and one that is being deleted', function (string $state) {
    User::factory()->{$state}()->create(['email' => 'ana@x.com']);

    [$exit, $output] = runResetLink('ana@x.com');

    expect($exit)->toBe(1)
        ->and(resetLinkIn($output))->toBeNull()
        ->and(DB::table('password_reset_tokens')->count())->toBe(0);
})->with(['disabled', 'deleting']);

it('sends no mail and no notification', function () {
    Mail::fake();
    Notification::fake();
    User::factory()->create(['email' => 'ana@x.com']);

    runResetLink('ana@x.com');

    Mail::assertNothingSent();
    Notification::assertNothingSent();
});
