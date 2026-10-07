<?php

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncDevice;

function postDistinctReflection(SyncDevice $device, int $number): Illuminate\Testing\TestResponse
{
    return $device->sync([Ops::reflection($number, "texto {$number}", '2026-10-05T12:09:00.000Z')]);
}

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $this->device = SyncDevice::signedIn($this);
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:00.000Z'));
});

it('lets the 60th sync of the minute through and answers 429 with Retry-After to the 61st', function () {
    foreach (range(1, 60) as $number) {
        postDistinctReflection($this->device, $number)->assertOk();
    }

    $response = postDistinctReflection($this->device, 61);

    $response->assertStatus(429)->assertJsonPath('code', 'too_many_requests');
    expect((int) $response->headers->get('Retry-After'))->toBeBetween(1, 60)
        ->and(DB::table('sync_operations')->count())->toBe(60);
});

it('counts a query with no operations and a rejected batch like any other sync', function () {
    foreach (range(1, 30) as $ignored) {
        $this->device->sync([])->assertOk();
    }
    foreach (range(1, 30) as $ignored) {
        $this->device->sync([], ['epoch' => 0])->assertStatus(422);
    }

    $this->device->sync([])->assertStatus(429);
});

it('lets the account sync again when the minute is over', function () {
    foreach (range(1, 60) as $number) {
        postDistinctReflection($this->device, $number)->assertOk();
    }
    $retryAfter = (int) postDistinctReflection($this->device, 61)->assertStatus(429)->headers->get('Retry-After');

    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:00.000Z')->addSeconds($retryAfter));

    postDistinctReflection($this->device, 62)->assertOk();
});

it('gives every account its own count', function () {
    foreach (range(1, 61) as $number) {
        postDistinctReflection($this->device, $number);
    }
    $other = SyncDevice::signedIn($this);

    postDistinctReflection($other, 100)->assertOk();
});

it('does not limit the reads of the snapshot', function () {
    foreach (range(1, 61) as $number) {
        postDistinctReflection($this->device, $number);
    }

    foreach (range(1, 70) as $ignored) {
        $this->device->snapshot()->assertOk();
    }
});
