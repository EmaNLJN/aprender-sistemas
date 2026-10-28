<?php

namespace App\Audit;

use App\Runs\Execution\ExecutorClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

final class ExecutorPreflight
{
    public function __construct(private ExecutorClient $client) {}

    public function check(): void
    {
        $url = config()->string('runs.executor.url');
        try {
            $health = $this->request()->get('/healthz');
            if (! $health->successful()) {
                throw AuditRefused::unreachable($url, "GET /healthz respondió {$health->status()}");
            }
            $probe = $this->request()->post('/v1/run', ['language' => '', 'program' => '']);
        } catch (ConnectionException $error) {
            throw AuditRefused::unreachable($url, $error->getMessage());
        }
        if ($probe->status() === 401) {
            throw AuditRefused::tokenRejected();
        }
        if ($probe->status() !== 400) {
            throw AuditRefused::unexpectedProbe($probe->status());
        }
    }

    private function request(): PendingRequest
    {
        return $this->client->prepare(Http::withOptions([]))
            ->connectTimeout(config()->integer('audit.preflight.connect_timeout'))
            ->timeout(config()->integer('audit.preflight.timeout'));
    }
}
