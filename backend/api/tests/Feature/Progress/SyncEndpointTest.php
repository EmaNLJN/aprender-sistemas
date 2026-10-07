<?php

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\Support\Sync\Ops;
use Tests\Support\Sync\SyncDevice;

const ENDPOINT_NOW = '2026-10-05T12:10:00.000Z';

beforeEach(function () {
    ProgressWorld::seed(MergeFixture::world());
    $user = ProgressWorld::user();
    $this->home = SyncDevice::signedIn($this, $user);
    $this->phone = SyncDevice::signedIn($this, $user);
    $this->travelTo(CarbonImmutable::parse(ENDPOINT_NOW));
});

describe('two devices that edit different fields', function () {
    it('end with both edits in either arrival order', function (bool $homeFirst) {
        $fromHome = fn () => $this->home->sync([Ops::reflection(1, 'desde casa', '2026-10-05T12:09:00.000Z')])->assertOk();
        $fromPhone = fn () => $this->phone->sync([Ops::customTest(2, 'desde el celular', '2026-10-05T12:09:30.000Z')])->assertOk();

        $homeFirst ? [$fromHome(), $fromPhone()] : [$fromPhone(), $fromHome()];

        $exercise = $this->phone->exercise();
        expect($exercise['reflection']['text'])->toBe('desde casa')
            ->and($exercise['customTest']['text'])->toBe('desde el celular');
    })->with([true, false]);
});

describe('two devices that edit the same field', function () {
    it('keep the newer clock in either arrival order', function (bool $olderFirst) {
        $older = Ops::reflection(1, 'vieja', '2026-10-05T12:09:00.000Z');
        $newer = Ops::reflection(2, 'nueva', '2026-10-05T12:09:30.000Z');

        $olderFirst ? [$this->home->sync([$older]), $this->phone->sync([$newer])] : [$this->phone->sync([$newer]), $this->home->sync([$older])];

        expect($this->home->exercise()['reflection'])->toBe(['text' => 'nueva', 'at' => '2026-10-05T12:09:30.000Z']);
    })->with([true, false]);

    it('keep the operation that arrives later when the clocks are equal', function (bool $homeFirst) {
        $fromHome = Ops::reflection(1, 'casa', '2026-10-05T12:09:00.000Z');
        $fromPhone = Ops::reflection(2, 'celular', '2026-10-05T12:09:00.000Z');

        $homeFirst ? [$this->home->sync([$fromHome]), $this->phone->sync([$fromPhone])] : [$this->phone->sync([$fromPhone]), $this->home->sync([$fromHome])];

        expect($this->home->exercise()['reflection']['text'])->toBe($homeFirst ? 'celular' : 'casa');
    })->with([true, false]);
});

it('does not let a device with its clock an hour ahead win forever', function () {
    $this->home->sync([Ops::reflection(1, 'adelantado', '2026-10-05T13:10:00.000Z')], ['sentAt' => '2026-10-05T13:10:00.000Z'])->assertOk();
    $this->travelTo(CarbonImmutable::parse('2026-10-05T12:10:30.000Z'));

    $this->phone->sync([Ops::reflection(2, 'en hora', '2026-10-05T12:10:30.000Z')])->assertOk();

    expect($this->home->exercise()['reflection'])->toBe(['text' => 'en hora', 'at' => '2026-10-05T12:10:30.000Z']);
});

describe('a tombstone', function () {
    it('wins against an older mark in either arrival order', function (bool $markFirst) {
        $mark = Ops::step(1, true, '2026-10-05T12:00:00.000Z');
        $unmark = Ops::step(2, false, '2026-10-05T12:05:00.000Z');

        $markFirst ? [$this->home->sync([$mark]), $this->phone->sync([$unmark])] : [$this->phone->sync([$unmark]), $this->home->sync([$mark])];

        $steps = $this->home->snapshot()->json('workshops.steps');
        expect($steps)->toHaveCount(1)
            ->and($steps[0]['marked'])->toBeFalse()
            ->and($steps[0]['at'])->toBe('2026-10-05T12:05:00.000Z');
    })->with([true, false]);

    it('wins for a route mark too', function () {
        $this->phone->sync([Ops::routeMark(1, false, '2026-10-05T12:05:00.000Z')]);

        $this->home->sync([Ops::routeMark(2, true, '2026-10-05T12:00:00.000Z')]);

        $marks = $this->home->snapshot()->json('route.marks');
        expect($marks)->toHaveCount(1)
            ->and($marks[0]['marked'])->toBeFalse();
    });
});

describe('the achievements that only grow', function () {
    it('keep a correct prediction when a newer write from another device says it was wrong', function () {
        $this->home->sync([Ops::prediction(1, 1, true, '2026-10-05T12:00:00.000Z')]);

        $this->phone->sync([Ops::prediction(2, 2, false, '2026-10-05T12:05:00.000Z')]);

        $exercise = $this->home->exercise();
        expect($exercise['predictionCorrect']['value'])->toBeTrue()
            ->and($exercise['prediction'])->toBe(['answer' => 2, 'at' => '2026-10-05T12:05:00.000Z']);
    });

    it('keep a declared assist when another device declares the other one later', function () {
        $this->home->sync([Ops::assist(1, 'assisted', '2026-10-05T12:00:00.000Z')]);

        $this->phone->sync([Ops::assist(2, 'solutionSeen', '2026-10-05T12:05:00.000Z')]);

        $exercise = $this->home->exercise();
        expect($exercise['assisted'])->toBeTrue()
            ->and($exercise['solutionSeen'])->toBeTrue();
    });

    it('keep the highest count of revealed hints', function () {
        $this->home->sync([Ops::hints(1, 3, '2026-10-05T12:00:00.000Z')]);

        $this->phone->sync([Ops::hints(2, 1, '2026-10-05T12:05:00.000Z')]);

        expect($this->home->exercise()['hintsRevealed'])->toBe(3);
    });
});

it('answers stale_content to an answer with another content version, stores it and does not grant the flag', function () {
    $stale = MergeFixture::world()['staleContentVersion'];

    $response = $this->home->sync([Ops::prediction(1, 1, true, '2026-10-05T12:09:00.000Z', $stale)])->assertOk();

    $exercise = $this->home->exercise();
    expect($response->json('results.0.status'))->toBe('stale_content')
        ->and($exercise['prediction']['answer'])->toBe(1)
        ->and($exercise['predictionCorrect']['value'])->toBeFalse();
});

describe('a batch that is sent again', function () {
    it('comes back all duplicate and changes nothing', function () {
        $batch = [Ops::reflection(1, 'una vez', '2026-10-05T12:09:00.000Z'), Ops::customTest(2, 'otra', '2026-10-05T12:09:10.000Z')];
        $first = $this->home->sync($batch)->assertOk();
        $before = [$this->home->snapshot()->json(), DB::table('sync_operations')->count()];

        $second = $this->home->sync($batch, ['knownRevision' => $first->json('revision')])->assertOk();

        expect(array_column($second->json('results'), 'status'))->toBe(['duplicate', 'duplicate'])
            ->and($second->json('revision'))->toBe($first->json('revision'))
            ->and([$this->home->snapshot()->json(), DB::table('sync_operations')->count()])->toBe($before);
    });

    it('keeps the stale_content reason of the first time', function () {
        $batch = [Ops::prediction(1, 1, true, '2026-10-05T12:09:00.000Z', MergeFixture::world()['staleContentVersion'])];
        $this->home->sync($batch)->assertOk();

        $again = $this->home->sync($batch)->assertOk();

        expect($again->json('results.0'))->toBe(['id' => SyncDevice::operationId(1), 'status' => 'duplicate', 'reason' => 'stale_content']);
    });

    it('answers uuid_reused when the id comes back with other content', function () {
        $this->home->sync([Ops::reflection(1, 'original', '2026-10-05T12:09:00.000Z')])->assertOk();

        $again = $this->home->sync([Ops::reflection(1, 'otro texto', '2026-10-05T12:09:00.000Z')])->assertOk();

        expect($again->json('results.0.status'))->toBe('uuid_reused')
            ->and($this->home->exercise()['reflection']['text'])->toBe('original');
    });
});

it('returns what lost a merge in changes, with the winning value, to a device that did not know it', function () {
    $first = $this->phone->sync([Ops::customTest(1, 'ya conocido', '2026-10-05T12:00:00.000Z')])->assertOk();
    $this->home->sync([Ops::reflection(2, 'ganadora', '2026-10-05T12:09:30.000Z')])->assertOk();

    $lost = $this->phone->sync([Ops::reflection(3, 'perdedora', '2026-10-05T12:09:00.000Z')], ['knownRevision' => $first->json('revision')])->assertOk();

    expect($lost->json('results.0.status'))->toBe('applied')
        ->and($lost->json('changes.full'))->toBeFalse()
        ->and($lost->json('changes.exercises.0.reflection'))->toBe(['text' => 'ganadora', 'at' => '2026-10-05T12:09:30.000Z'])
        ->and($lost->json('changes.exercises.0.customTest'))->toBe(['text' => 'ya conocido', 'at' => '2026-10-05T12:00:00.000Z']);
});

it('reports the rows that the own batch changed in the same response', function () {
    $first = $this->home->sync([Ops::reflection(1, 'uno', '2026-10-05T12:00:00.000Z')])->assertOk();

    $second = $this->home->sync([Ops::customTest(2, 'dos', '2026-10-05T12:01:00.000Z')], ['knownRevision' => $first->json('revision')])->assertOk();

    expect($second->json('changes.full'))->toBeFalse()
        ->and($second->json('changes.exercises.0.customTest.text'))->toBe('dos')
        ->and($second->json('revision'))->toBe(2);
});

describe('an operation whose UUID was pruned after 15 days', function () {
    beforeEach(function () {
        $this->original = Ops::reflection(1, 'vieja', '2026-10-05T12:00:00.000Z');
        $this->newer = Ops::reflection(2, 'nueva', '2026-10-05T13:00:00.000Z');
        $this->travelTo(CarbonImmutable::parse('2026-10-05T13:10:00.000Z'));
        $this->home->sync([$this->original])->assertOk();
        $this->phone->sync([$this->newer])->assertOk();
        $this->travelTo(CarbonImmutable::parse('2026-10-20T13:10:00.000Z'));
        $this->artisan('progress:prune-sync-operations')->assertSuccessful();
        $this->home = SyncDevice::signedIn($this, $this->home->user);
    });

    it('is applied again and does not overwrite a newer value', function () {
        expect(DB::table('sync_operations')->count())->toBe(0);

        $again = $this->home->sync([$this->original], ['knownRevision' => 2])->assertOk();

        expect($again->json('results.0.status'))->toBe('applied')
            ->and($this->home->exercise()['reflection'])->toBe(['text' => 'nueva', 'at' => '2026-10-05T13:00:00.000Z'])
            ->and($again->json('revision'))->toBe(2)
            ->and(DB::table('sync_operations')->count())->toBe(1);
    });

    it('is answered as a duplicate again once it has been recorded again', function () {
        $this->home->sync([$this->original])->assertOk();

        $third = $this->home->sync([$this->original])->assertOk();

        expect($third->json('results.0.status'))->toBe('duplicate');
    });
});
