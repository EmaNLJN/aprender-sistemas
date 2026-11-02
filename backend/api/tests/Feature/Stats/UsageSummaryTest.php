<?php

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Tests\Support\Browser;
use Tests\Support\StatsWorld;

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse(StatsWorld::NOW, 'UTC'));
    $this->ids = StatsWorld::create();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn(User::findOrFail($this->ids['admin']));
});

it('adds the usage summary at the end of the ficha, counted by hand', function () {
    $ana = $this->browser->get("/api/admin/users/{$this->ids['ana']}")->assertOk()->json('data');
    $beto = $this->browser->get("/api/admin/users/{$this->ids['beto']}")->assertOk()->json('data');

    expect(array_key_last($ana))->toBe('usage')
        ->and($ana['usage'])->toBe(['lastActivityAt' => '2026-10-20T10:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 0], 'attemptsLastMonth' => 3, 'imports' => 0])
        ->and($beto['usage'])->toBe(['lastActivityAt' => '2026-10-15T12:00:00.000Z', 'solved' => ['server' => 1, 'imported' => 1], 'attemptsLastMonth' => 1, 'imports' => 1]);
});

it('keeps answering the ficha of an account being deleted, with a null usage', function () {
    $this->browser->get("/api/admin/users/{$this->ids['eva']}")->assertOk()
        ->assertJsonPath('data.status', 'deleting')
        ->assertJsonPath('data.usage', null);
});

it('logs each successful ficha with the view summary', function () {
    Log::spy();

    $this->browser->get("/api/admin/users/{$this->ids['eva']}")->assertOk();

    Log::shouldHaveReceived('info')->once()->withArgs(fn (string $message, array $context = []) => $message === 'admin.student_viewed'
        && $context === ['target_id' => $this->ids['eva'], 'view' => 'summary']);
});

it('leaves the list of accounts without usage', function () {
    $first = $this->browser->get('/api/admin/users')->assertOk()->json('data.0');

    expect($first)->not->toHaveKey('usage');
});
