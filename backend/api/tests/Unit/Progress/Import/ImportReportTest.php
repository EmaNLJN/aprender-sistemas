<?php

use App\Progress\Import\ImportReport;
use App\Progress\Import\Legacy\ReportEntry;

const REPORT_JSON = <<<'JSON'
{
  "written": {"exercises": 11, "drafts": 11, "attempts": 11, "campaignSeals": 9, "campaignCheckpoints": 1, "workshops": 1,
              "workshopObjectives": 3, "workshopSteps": 1, "routeMarks": 4, "routeQuiz": 1, "routeNotes": 1, "preferences": 1},
  "omitted": [{"path": "lab.records.rust-02.reviewAt", "reason": "date_out_of_range"}],
  "replaced": [{"path": "raw", "reason": "replacement_character"}],
  "conflicts": [{"path": "lab.records.rust-06.reflection", "reason": "newer_value_kept"}]
}
JSON;

it('reads the stored JSON and writes it back without losing anything', function () {
    $report = ImportReport::fromJson(REPORT_JSON);

    expect($report->toArray())->toBe(json_decode(REPORT_JSON, true, 512, JSON_THROW_ON_ERROR))
        ->and($report->omitted[0])->toEqual(new ReportEntry('lab.records.rust-02.reviewAt', 'date_out_of_range'))
        ->and($report->conflicts[0]->reason)->toBe('newer_value_kept');
});

it('always has the twelve areas, in wire order, and zero for the ones that were not counted', function () {
    $report = new ImportReport(['routeMarks' => 4, 'exercises' => 2], [], [], []);

    expect($report->toArray()['written'])->toBe([
        'exercises' => 2, 'drafts' => 0, 'attempts' => 0, 'campaignSeals' => 0, 'campaignCheckpoints' => 0, 'workshops' => 0,
        'workshopObjectives' => 0, 'workshopSteps' => 0, 'routeMarks' => 4, 'routeQuiz' => 0, 'routeNotes' => 0, 'preferences' => 0,
    ]);
});

it('serializes an empty report with the lists as arrays and the areas as an object', function () {
    $json = json_encode((new ImportReport([], [], [], []))->toArray(), JSON_THROW_ON_ERROR);

    expect($json)->toStartWith('{"written":{"exercises":0,')
        ->and($json)->toEndWith('"omitted":[],"replaced":[],"conflicts":[]}');
});

it('survives a round trip of the three lists with text outside ASCII', function () {
    $report = new ImportReport(
        [],
        [new ReportEntry('systems.records.rust:pc.steps[3]', 'unknown_step_position')],
        [new ReportEntry('lab.records.ñandú-01.reflection', 'replacement_character')],
        [new ReportEntry('route.notes.rust.learned', 'newer_value_kept')],
    );

    expect(ImportReport::fromJson(json_encode($report->toArray(), JSON_THROW_ON_ERROR))->toArray())->toBe($report->toArray());
});
