<?php

namespace App\Runs\Execution;

use App\Runs\Evidence\ExpectedEvidence;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Evidence\Verdict;
use App\Runs\Record\RunRow;
use App\Runs\RunLog;
use App\Runs\RunReason;
use Illuminate\Support\Sleep;
use LogicException;

final class RunExecution implements RunProcessor
{
    private const CLOSE_BACKOFF_MS = [200, 1000];

    public function __construct(
        private RunClaimer $claimer,
        private ExecutorClient $client,
        private ResultClassifier $classifier,
        private RunCloser $closer,
        private RunRequeuer $requeuer,
    ) {}

    public function process(string $runId): void
    {
        $claim = $this->claimer->claim($runId);
        $run = $claim->outcome === ClaimOutcome::Ready ? $claim->run : null;
        if ($run === null) {
            return;
        }
        $program = $run->program ?? throw new LogicException("La ejecución {$run->id} reclamada no tiene programa.");
        $reply = $this->client->send($run->language, $program);

        match ($reply->kind) {
            ReplyKind::Result => $this->close($run->id, $this->classify($run, $reply)),
            ReplyKind::Busy, ReplyKind::NotReached => $this->requeuer->requeue($run, $reply->retryAfterSeconds),
            ReplyKind::Failed => $this->executorFailed($run, $reply),
        };
    }

    private function classify(RunRow $run, ExecutorReply $reply): Verdict
    {
        $result = $reply->result ?? throw new LogicException('Una respuesta Result sin resultado.');

        return $this->classifier->classify($result, new ExpectedEvidence($run->nonce, $run->expectedTests, $run->customTest !== null));
    }

    private function executorFailed(RunRow $run, ExecutorReply $reply): void
    {
        RunLog::executorFailed($run, $reply->cause, $reply->httpStatus);
        $this->close($run->id, Verdict::infraError(RunReason::ExecutorError));
    }

    private function close(string $runId, Verdict $verdict): void
    {
        foreach (self::CLOSE_BACKOFF_MS as $backoffMs) {
            try {
                $this->closer->close($runId, $verdict);

                return;
            } catch (RunWriteFailed) {
                Sleep::for($backoffMs)->milliseconds();
            }
        }
        $this->closer->close($runId, $verdict);
    }
}
