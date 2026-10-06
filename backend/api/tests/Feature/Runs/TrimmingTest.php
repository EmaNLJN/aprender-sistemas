<?php

use App\Runs\RunLimiters;
use Illuminate\Support\Facades\DB;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

beforeEach(function () {
    RunLimiters::register();
    RunWorld::exercise();
    $this->user = RunWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

function trimmingBody(array $overrides = []): array
{
    return ['clientRunId' => '0199f4a2-8e03-7c5a-b3d1-9a77c0de4f21', 'exerciseId' => 'rust-01', 'code' => 'fn main() {}', ...$overrides];
}

it('stores the code without trimming it', function () {
    $code = " \t\r\nfn main() {}\r\n\t ";

    $this->browser->post('/api/runs', trimmingBody(['code' => $code]))->assertStatus(202);

    expect(DB::table('runs')->value('code'))->toBe($code);
});

it('stores a blank custom test as null and a padded one trimmed', function (string $sent, ?string $stored) {
    $this->browser->post('/api/runs', trimmingBody(['customTest' => $sent]))->assertStatus(202);

    expect(DB::table('runs')->value('custom_test'))->toBe($stored);
})->with([
    'empty' => ['', null],
    'blank' => [" \t\n ", null],
    'padded' => ["  x == 1 \n", 'x == 1'],
]);

it('still trims the text of a route outside /api/runs', function () {
    $this->browser->send('PATCH', '/api/me', ['name' => '  Ana  '])->assertOk();

    expect($this->user->fresh()->name)->toBe('Ana');
});
