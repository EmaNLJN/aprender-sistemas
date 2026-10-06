<?php

namespace App\Runs;

use App\Content\Record\RowFields;
use App\Runs\Evidence\TestVerdict;
use App\Runs\Record\RunRow;
use Illuminate\Support\Facades\DB;

final class RunReader
{
    public function find(int $userId, string $runId): ?RunView
    {
        $rows = DB::select('select * from `runs` where `id` = ? and `user_id` = ?', [$runId, $userId]);

        return $rows === [] ? null : $this->view(RunRow::fromRow(get_object_vars($rows[0])));
    }

    public function view(RunRow $run): RunView
    {
        if ($run->status === RunStatus::Queued) {
            return new RunView($run, $this->queuePosition($run), [], null);
        }
        if ($run->attemptId === null) {
            return new RunView($run, null, [], null);
        }

        return new RunView($run, null, $this->verdicts($run->attemptId), $this->customOutcome($run->attemptId));
    }

    private function queuePosition(RunRow $run): int
    {
        $ahead = DB::scalar("select count(*) from `runs` where `status` = 'queued' and `id` < ?", [$run->id]);

        return (is_numeric($ahead) ? (int) $ahead : 0) + 1;
    }

    /** @return list<TestVerdict> */
    private function verdicts(int $attemptId): array
    {
        $verdicts = [];
        foreach (DB::select('select `test_key`, `outcome` from `attempt_tests` where `attempt_id` = ? order by `position`', [$attemptId]) as $row) {
            $fields = new RowFields(get_object_vars($row), 'attempt_tests');
            $verdicts[] = new TestVerdict($fields->string('test_key'), TestOutcome::from($fields->string('outcome')));
        }

        return $verdicts;
    }

    private function customOutcome(int $attemptId): ?TestOutcome
    {
        $outcome = DB::scalar('select `custom_outcome` from `attempts` where `id` = ?', [$attemptId]);

        return is_string($outcome) ? TestOutcome::from($outcome) : null;
    }
}
