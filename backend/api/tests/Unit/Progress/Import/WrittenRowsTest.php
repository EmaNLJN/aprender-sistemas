<?php

use App\Progress\Import\WrittenRows;

function writtenRowsCountsWith(array $overrides): array
{
    return [...array_fill_keys(WrittenRows::AREAS, 0), ...$overrides];
}

it('lists the twelve areas of the import report in wire order', function () {
    expect(WrittenRows::AREAS)->toBe([
        'exercises', 'drafts', 'attempts', 'campaignSeals', 'campaignCheckpoints', 'workshops',
        'workshopObjectives', 'workshopSteps', 'routeMarks', 'routeQuiz', 'routeNotes', 'preferences',
    ]);
});

it('does not count as a change when only legacy attempts were inserted', function () {
    expect((new WrittenRows(writtenRowsCountsWith(['attempts' => 3])))->changed())->toBeFalse();
});

it('does not count as a change when nothing was written', function () {
    expect((new WrittenRows(writtenRowsCountsWith([])))->changed())->toBeFalse();
});

it('counts as a change when any state area other than attempts has rows', function (string $area) {
    expect((new WrittenRows(writtenRowsCountsWith([$area => 1])))->changed())->toBeTrue();
})->with(['exercises', 'drafts', 'campaignSeals', 'campaignCheckpoints', 'workshops', 'workshopObjectives', 'workshopSteps', 'routeMarks', 'routeQuiz', 'routeNotes', 'preferences']);
