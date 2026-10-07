<?php

namespace App\Accounts;

final class UserTables
{
    private const CASCADE_FROM_USERS = 'Deleted by the cascade of the final transaction.';

    /** @return list<UserTable> */
    public static function all(): array
    {
        return [
            UserTable::exception('sessions', Ownership::UserId, 'Operational, not written by the person; ended when the deletion is requested and cascaded from users.'),
            UserTable::exception('invitations', Ownership::ByEmail, 'Not exported (FR-043); the ones the account created and the ones for its email are deleted when the deletion is requested.'),
            UserTable::exception('password_reset_tokens', Ownership::ByEmail, 'Not exported (FR-043); deleted when the deletion is requested.'),
            UserTable::exception('account_deletions', Ownership::Ledger, 'The ledger has no personal data and no foreign key; it is pruned after 35 days.'),
            UserTable::owned('progress_heads', null, 'It is the lock of the account; the epoch and the revision belong to the synchronization, not to the data of the person.', null, 'Locked by the final transaction and deleted by the cascade.'),
            UserTable::owned('runs', null, 'Operational, lives 14 days; its code and output live in the attempt payload.', 'id', null),
            UserTable::owned('exercise_progress', 'progress', null, 'exercise_id', null),
            UserTable::owned('attempts', 'attempts', null, 'id', null),
            UserTable::child('attempt_tests', 'attempts', 'attempts', null, 'Cascade of the attempts batch.'),
            UserTable::child('attempt_payloads', 'attempts', 'attempts', null, 'Cascade of the attempts batch.'),
            UserTable::owned('sync_operations', null, 'Operational, it only keeps UUIDs and fingerprints.', 'operation_id', null),
            UserTable::owned('drafts', 'progress', null, null, self::CASCADE_FROM_USERS),
            UserTable::owned('campaign_checkpoints', 'progress', null, null, self::CASCADE_FROM_USERS),
            UserTable::owned('workshop_progress', 'progress', null, null, self::CASCADE_FROM_USERS),
            UserTable::owned('route_marks', 'progress', null, null, self::CASCADE_FROM_USERS),
            UserTable::owned('route_quiz_answers', 'progress', null, null, self::CASCADE_FROM_USERS),
            UserTable::owned('route_notes', 'progress', null, null, self::CASCADE_FROM_USERS),
            UserTable::owned('preferences', 'progress', null, null, self::CASCADE_FROM_USERS),
            UserTable::child('workshop_observations', 'workshop_progress', 'progress', null, 'Cascade through workshop_progress.'),
            UserTable::child('workshop_step_marks', 'workshop_progress', 'progress', null, 'Cascade through workshop_progress.'),
        ];
    }
}
