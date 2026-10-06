<?php

use App\Runs\RunLimiters;
use Tests\Support\Browser;
use Tests\Support\RunWorld;

beforeEach(function () {
    RunLimiters::register();
    RunWorld::exercise();
    $this->user = RunWorld::user();
    $this->browser = Browser::for($this)->useDatabaseDrivers()->signIn($this->user);
});

function invalidSubmission(Browser $browser)
{
    return $browser->post('/api/runs', ['clientRunId' => 'not-a-uuid']);
}

it('answers 429 too_many_requests with Retry-After to the 31st post in a minute, rejected ones included', function () {
    foreach (range(1, 30) as $post) {
        invalidSubmission($this->browser)->assertStatus(422);
    }

    $response = invalidSubmission($this->browser);

    $response->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
    expect((int) $response->headers->get('Retry-After'))->toBeGreaterThanOrEqual(1)
        ->and($response->headers->getCacheControlDirective('no-store'))->toBeTrue();
});

it('gives every account its own count', function () {
    foreach (range(1, 31) as $post) {
        invalidSubmission($this->browser);
    }
    $other = Browser::for($this)->useDatabaseDrivers()->signIn(RunWorld::user());

    invalidSubmission($other)->assertStatus(422);
});

it('takes the limit from the configuration', function () {
    config(['runs.throttle_per_minute' => 2]);

    invalidSubmission($this->browser)->assertStatus(422);
    invalidSubmission($this->browser)->assertStatus(422);
    invalidSubmission($this->browser)->assertStatus(429);
});
