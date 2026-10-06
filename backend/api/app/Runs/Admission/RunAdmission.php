<?php

namespace App\Runs\Admission;

use App\Jobs\ExecuteRun;
use App\Progress\AccountGone;
use App\Progress\AccountLock;
use App\Progress\ProgressHead;
use App\Runs\Execution\RunWriteFailed;
use App\Runs\Program\ComposedProgram;
use App\Runs\Program\ExerciseSnapshot;
use App\Runs\Program\ProgramComposer;
use App\Runs\Program\Whitespace;
use App\Runs\Record\Instant;
use App\Runs\Record\RunRow;
use App\Runs\RunLog;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class RunAdmission
{
    public function __construct(
        private ExerciseReader $exercises,
        private ProgramComposer $composer,
        private AccountLock $lock,
        private QuotaPolicy $quotas,
    ) {}

    /** @throws RunRejected|RunWriteFailed */
    public function admit(int $userId, SubmittedRun $submitted): AdmissionResult
    {
        $request = $this->normalized($submitted);
        $exercise = $this->exercises->forRun($request->exerciseId) ?? throw new RunRejected(Rejection::unknownExercise());
        $program = $this->composer->compose($exercise, $request->code, $request->customTest, bin2hex(random_bytes(16)));
        try {
            $result = $this->lock->within(
                $userId,
                fn (ProgressHead $head): AdmissionResult => $this->admitUnder($head, $request, $exercise, $program),
            );
        } catch (AccountGone) {
            throw new RunRejected(Rejection::accountDisabled());
        } catch (QueryException $error) {
            throw RunWriteFailed::from($error);
        }
        if ($result->created) {
            RunLog::admitted($result->run);
        }

        return $result;
    }

    private function normalized(SubmittedRun $submitted): SubmittedRun
    {
        $customTest = $submitted->customTest === null ? '' : Whitespace::trim($submitted->customTest);

        return new SubmittedRun($submitted->clientRunId, $submitted->exerciseId, $submitted->code, $customTest === '' ? null : $customTest);
    }

    private function admitUnder(ProgressHead $head, SubmittedRun $request, ExerciseSnapshot $exercise, ComposedProgram $program): AdmissionResult
    {
        if (DB::scalar('select `status` from `users` where `id` = ? for share', [$head->userId]) !== 'active') {
            throw new RunRejected(Rejection::accountDisabled());
        }
        $existing = $this->existing($head->userId, $request->clientRunId);
        if ($existing !== null) {
            return $this->retry($existing, $request);
        }
        $now = Instant::now();
        $rejection = $this->quotas->check($this->quotas->usage($head->userId, $now), $now) ?? $this->quotas->checkQueue($this->quotas->queued());
        if ($rejection !== null) {
            throw new RunRejected($rejection);
        }
        $run = $this->insert($head, $request, $exercise, $program, $now);
        ExecuteRun::dispatch($run->id);

        return new AdmissionResult($run, true);
    }

    private function existing(int $userId, string $clientRunId): ?RunRow
    {
        $rows = DB::select('select * from `runs` where `user_id` = ? and `client_run_id` = ?', [$userId, $clientRunId]);

        return $rows === [] ? null : RunRow::fromRow(get_object_vars($rows[0]));
    }

    private function retry(RunRow $existing, SubmittedRun $request): AdmissionResult
    {
        $isSameRequest = $existing->exerciseId === $request->exerciseId
            && $existing->code === $request->code
            && $existing->customTest === $request->customTest;

        return $isSameRequest ? new AdmissionResult($existing, false) : throw new RunRejected(Rejection::clientRunIdReused());
    }

    private function insert(ProgressHead $head, SubmittedRun $request, ExerciseSnapshot $exercise, ComposedProgram $program, CarbonImmutable $now): RunRow
    {
        $id = (string) Str::uuid7(time: $now);
        DB::insert(
            'insert into `runs` (`id`, `user_id`, `client_run_id`, `exercise_id`, `language`, `epoch`, `grading_hash`, `expected_tests`, `nonce`, `code`, `custom_test`, `program`, `status`, `created_at`, `expires_at`)'
            .' values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $id, $head->userId, $request->clientRunId, $exercise->exerciseId, $exercise->language->value, $head->epoch, $exercise->gradingHash,
                json_encode($program->expectedTests, JSON_THROW_ON_ERROR), $program->nonce, $request->code, $request->customTest, $program->text, 'queued',
                Instant::format($now), Instant::format($now->addSeconds(config()->integer('runs.expiry.queued_seconds'))),
            ],
        );

        $rows = DB::select('select * from `runs` where `id` = ?', [$id]);

        return RunRow::fromRow(get_object_vars($rows[0]));
    }
}
