<?php

use App\Progress\ProgressTables;

it('lists the eleven state tables in creation order, with campaign_seals last', function () {
    expect(ProgressTables::STATE)->toBe([
        'exercise_progress', 'drafts', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations',
        'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences', 'campaign_seals',
    ]);
});
