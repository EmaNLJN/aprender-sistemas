<?php

namespace App\Progress;

final class ProgressTables
{
    public const STATE = [
        'exercise_progress', 'drafts', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations',
        'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences',
    ];

    public const CREATED = [
        'sync_operations', 'drafts', 'campaign_checkpoints', 'workshop_progress', 'workshop_observations',
        'workshop_step_marks', 'route_marks', 'route_quiz_answers', 'route_notes', 'preferences',
    ];
}
