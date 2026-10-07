<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

beforeEach(fn () => Carbon::setTestNow('2026-10-05 12:00:00'));

afterEach(fn () => Carbon::setTestNow());

/** @return array{int, string} */
function runInvite(array $arguments): array
{
    $exit = Artisan::call('taller:invite', $arguments);

    return [$exit, Artisan::output()];
}

function linkIn(string $output): ?string
{
    foreach (explode("\n", $output) as $line) {
        if (preg_match('#^https?://.+/\#invitacion=[A-Za-z0-9_-]{43}$#', $line) === 1) {
            return $line;
        }
    }

    return null;
}

it('creates the invitation and prints its link on its own line', function () {
    [$exit, $output] = runInvite(['email' => 'ana@x.com']);

    expect($exit)->toBe(0)
        ->and(linkIn($output))->not->toBeNull()
        ->and($output)->toContain('ana@x.com')
        ->and($output)->toContain('student')
        ->and($output)->toContain('2026-10-12 12:00:00')
        ->and(DB::table('invitations')->where('email', 'ana@x.com')->exists())->toBeTrue();
});

it('invites an admin that expires in forty-eight hours', function () {
    [$exit, $output] = runInvite(['email' => 'root@x.com', '--role' => 'admin']);

    expect($exit)->toBe(0)
        ->and($output)->toContain('admin')
        ->and($output)->toContain('2026-10-07 12:00:00')
        ->and(DB::table('invitations')->value('role'))->toBe('admin');
});

it('renews an existing invitation with another token', function () {
    [, $first] = runInvite(['email' => 'ana@x.com']);

    [$exit, $second] = runInvite(['email' => 'ana@x.com']);

    expect($exit)->toBe(0)
        ->and(linkIn($second))->not->toBe(linkIn($first))
        ->and(DB::table('invitations')->count())->toBe(1);
});

it('refuses an email that already has an account', function () {
    User::factory()->create(['email' => 'ana@x.com']);

    [$exit, $output] = runInvite(['email' => 'ANA@x.com']);

    expect($exit)->toBe(1)
        ->and($output)->toContain('Ya existe')
        ->and(linkIn($output))->toBeNull()
        ->and(DB::table('invitations')->count())->toBe(0);
});

it('refuses an unknown role with exit code 2 and says which are valid', function () {
    [$exit, $output] = runInvite(['email' => 'ana@x.com', '--role' => 'teacher']);

    expect($exit)->toBe(2)
        ->and($output)->toContain('admin')
        ->and($output)->toContain('student')
        ->and(DB::table('invitations')->count())->toBe(0);
});

it('refuses an invalid email with exit code 2', function () {
    [$exit, $output] = runInvite(['email' => 'not-an-email']);

    expect($exit)->toBe(2)
        ->and($output)->toContain('email')
        ->and(DB::table('invitations')->count())->toBe(0);
});

it('builds the link from APP_URL', function () {
    config(['app.url' => 'https://taller.example']);

    [, $output] = runInvite(['email' => 'ana@x.com']);

    expect(linkIn($output))->toStartWith('https://taller.example/#invitacion=');
});

it('keeps the token out of every column of the database', function () {
    [, $output] = runInvite(['email' => 'ana@x.com']);
    $token = substr((string) linkIn($output), -43);

    $row = (array) DB::table('invitations')->first();

    expect(collect($row)->filter(fn ($value) => is_string($value) && str_contains($value, $token)))->toBeEmpty();
});

it('keeps the link out of the logs', function () {
    Log::spy();

    [, $output] = runInvite(['email' => 'ana@x.com']);

    $token = substr((string) linkIn($output), -43);
    Log::shouldNotHaveReceived('info', fn ($message, $context = []) => str_contains(json_encode([$message, $context]), $token));
});
