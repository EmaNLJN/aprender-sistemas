<?php

namespace App\Runs\Execution;

use App\Runs\Evidence\ExecutorResult;
use App\Runs\RunLanguage;
use GuzzleHttp\Exception\ConnectException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

final class ExecutorClient
{
    private const NEVER_REACHED_ERRNOS = [6, 7];

    public function send(RunLanguage $language, string $program): ExecutorReply
    {
        try {
            $response = Http::baseUrl(config()->string('runs.executor.url'))
                ->withToken(config()->string('runs.executor.token'))
                ->acceptJson()
                ->asJson()
                ->connectTimeout(config()->integer('runs.executor.connect_timeout'))
                ->timeout(config()->integer('runs.executor.request_timeout'))
                ->post('/v1/run', ['language' => $language->value, 'program' => $program]);
        } catch (ConnectionException $error) {
            return $this->neverReached($error) ? ExecutorReply::notReached() : ExecutorReply::failed('connection', null);
        }

        return $this->fromResponse($response);
    }

    // A ConnectionException also covers a timeout and an empty reply, which may have run the code (R8).
    // Guzzle 8 dropped getHandlerContext(): the cURL errno survives only in the message.
    private function neverReached(ConnectionException $error): bool
    {
        $previous = $error->getPrevious();

        return $previous instanceof ConnectException
            && preg_match('/^cURL error (\d+):/', $previous->getMessage(), $matches) === 1
            && in_array((int) $matches[1], self::NEVER_REACHED_ERRNOS, true);
    }

    private function fromResponse(Response $response): ExecutorReply
    {
        if ($response->status() === 503) {
            $after = $response->header('Retry-After');

            return ExecutorReply::busy(ctype_digit($after) ? (int) $after : 1);
        }
        if (! $response->successful()) {
            return ExecutorReply::failed('status', $response->status());
        }
        $result = ExecutorResult::fromPayload($response->json());

        return $result === null ? ExecutorReply::failed('invalid_body', $response->status()) : ExecutorReply::result($result);
    }
}
