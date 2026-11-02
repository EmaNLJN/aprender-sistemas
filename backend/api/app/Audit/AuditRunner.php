<?php

namespace App\Audit;

use App\Runs\Evidence\ExpectedEvidence;
use App\Runs\Evidence\ResultClassifier;
use App\Runs\Execution\ExecutorReply;
use App\Runs\Execution\ReplyKind;
use Closure;

final class AuditRunner
{
    public function __construct(private ExecutorDispatcher $dispatcher, private ResultClassifier $classifier) {}

    /**
     * @param  list<AuditProgram>  $programs
     * @param  Closure(int, int): void  $progress
     * @return list<JudgedProgram>
     */
    public function run(array $programs, int $concurrency, AuditLimits $limits, Closure $progress): array
    {
        $judge = new ProgramJudge($limits);
        $judged = [];
        foreach (array_chunk($programs, max(1, $concurrency * config()->integer('audit.batch_per_slot'))) as $batch) {
            $keyed = [];
            foreach ($batch as $program) {
                $keyed['p'.(count($judged) + count($keyed))] = $program;
            }
            $replies = $this->dispatcher->dispatch($keyed, $concurrency);
            foreach ($keyed as $key => $program) {
                $judged[] = $this->judge($judge, $program, $replies[$key] ?? ExecutorReply::failed('unavailable', null));
            }
            $progress(count($judged), count($programs));
        }

        return $judged;
    }

    private function judge(ProgramJudge $judge, AuditProgram $program, ExecutorReply $reply): JudgedProgram
    {
        if ($reply->kind !== ReplyKind::Result || $reply->result === null) {
            return JudgedProgram::noVerdict($program, $reply);
        }
        $composed = $program->composed;
        $verdict = $this->classifier->classify($reply->result, new ExpectedEvidence($composed->nonce, $composed->expectedTests, $composed->hasCustomTest));

        return $judge->judge($program, $reply->result, $verdict);
    }
}
