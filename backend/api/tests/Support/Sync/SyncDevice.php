<?php

namespace Tests\Support\Sync;

use App\Models\User;
use App\Runs\Record\Instant;
use Illuminate\Testing\TestResponse;
use Tests\Support\Browser;
use Tests\Support\MergeFixture;
use Tests\Support\ProgressWorld;
use Tests\TestCase;

final class SyncDevice
{
    private function __construct(public readonly User $user, public readonly Browser $browser) {}

    public static function signedIn(TestCase $test, ?User $user = null): self
    {
        $user ??= ProgressWorld::user();

        return new self($user, Browser::for($test)->useDatabaseDrivers()->signIn($user));
    }

    public static function operationId(int $number): string
    {
        return sprintf('00000000-0000-4000-8000-%012d', $number);
    }

    /**
     * @param  list<array<string, mixed>>  $operations
     * @param  array<string, mixed>  $envelope
     */
    public function sync(array $operations, array $envelope = []): TestResponse
    {
        return $this->browser->post('/api/sync', $this->envelope($operations, $envelope));
    }

    public function snapshot(): TestResponse
    {
        return $this->browser->get('/api/progress');
    }

    /**
     * @param  list<array<string, mixed>>  $operations
     * @param  array<string, mixed>  $envelope
     * @return array<string, mixed>
     */
    public function envelope(array $operations, array $envelope = []): array
    {
        return [
            'epoch' => 1,
            'sentAt' => Instant::iso(Instant::now()),
            'knownRevision' => 0,
            'knownContentVersion' => MergeFixture::world()['contentVersion'],
            'format' => 2,
            'operations' => $operations,
            ...$envelope,
        ];
    }
}
