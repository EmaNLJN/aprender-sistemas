<?php

namespace App\Audit;

use App\Runs\Execution\ExecutorClient;
use App\Runs\Execution\ExecutorReply;
use App\Runs\Execution\ReplyKind;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

final class ExecutorDispatcher
{
    public function __construct(private ExecutorClient $client) {}

    /**
     * @param  array<string, AuditProgram>  $programs
     * @return array<string, ExecutorReply>
     */
    public function dispatch(array $programs, int $concurrency): array
    {
        $final = [];
        $pending = $programs;
        $maxRounds = config()->integer('audit.retry.max_rounds');
        for ($round = 1; $pending !== [] && $round <= $maxRounds; $round++) {
            $retry = [];
            $wait = 0;
            foreach ($this->send($pending, $concurrency) as $key => $reply) {
                if ($reply->kind === ReplyKind::Busy || $reply->kind === ReplyKind::NotReached) {
                    $retry[$key] = $pending[$key];
                    $wait = max($wait, $this->waitFor($reply));
                } else {
                    $final[$key] = $reply;
                }
            }
            $pending = $retry;
            if ($pending !== [] && $round < $maxRounds) {
                Sleep::for($wait)->seconds();
            }
        }
        foreach (array_keys($pending) as $key) {
            $final[$key] = ExecutorReply::failed('unavailable', null);
        }

        return $this->inOrder($programs, $final);
    }

    private function waitFor(ExecutorReply $reply): int
    {
        if ($reply->kind === ReplyKind::NotReached) {
            return 1;
        }

        return min(max($reply->retryAfterSeconds, 1), config()->integer('audit.retry.max_wait_seconds'));
    }

    /**
     * @param  array<string, AuditProgram>  $programs
     * @return array<string, ExecutorReply>
     */
    private function send(array $programs, int $concurrency): array
    {
        $outcomes = Http::pool(function (Pool $pool) use ($programs): void {
            foreach ($programs as $key => $program) {
                $this->client->prepare($pool->as($key))
                    ->post('/v1/run', ExecutorClient::body($program->exercise->snapshot->language, $program->composed->text));
            }
        }, concurrency: max(1, $concurrency));
        $replies = [];
        foreach (array_keys($programs) as $key) {
            $outcome = $outcomes[$key] ?? null;
            $replies[$key] = $outcome instanceof Response || $outcome instanceof ConnectionException
                ? $this->client->read($outcome)
                : ExecutorReply::failed('exception', null);
        }

        return $replies;
    }

    /**
     * @param  array<string, AuditProgram>  $programs
     * @param  array<string, ExecutorReply>  $replies
     * @return array<string, ExecutorReply>
     */
    private function inOrder(array $programs, array $replies): array
    {
        $ordered = [];
        foreach (array_keys($programs) as $key) {
            $ordered[$key] = $replies[$key] ?? ExecutorReply::failed('unavailable', null);
        }

        return $ordered;
    }
}
