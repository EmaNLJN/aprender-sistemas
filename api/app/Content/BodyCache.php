<?php

namespace App\Content;

use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use LogicException;

/**
 * The body cache (ADR 0006 D11): the exact bytes of each portion, under a key with its full hash
 * (`content-body:<portion>:<sha256>`) and without any build. A body whose sha256 is not the one in
 * its key is never served or stored: a tampered entry counts as missing.
 */
final class BodyCache
{
    public function get(Portion $portion, string $hash): ?string
    {
        $body = $this->store()->get($this->key($portion, $hash));
        if (! is_string($body)) {
            return null;
        }
        if (hash('sha256', $body) !== $hash) {
            $this->forget($portion, $hash);

            return null;
        }

        return $body;
    }

    public function put(Portion $portion, string $hash, string $body): void
    {
        if (hash('sha256', $body) !== $hash) {
            throw new LogicException("El cuerpo de {$portion->value} no tiene el hash {$hash}: no se guarda.");
        }
        $this->store()->put($this->key($portion, $hash), $body, now()->addDays((int) config('content.cache_days')));
    }

    public function forget(Portion $portion, string $hash): void
    {
        $this->store()->forget($this->key($portion, $hash));
    }

    public function has(Portion $portion, string $hash): bool
    {
        return $this->store()->has($this->key($portion, $hash));
    }

    private function key(Portion $portion, string $hash): string
    {
        return "content-body:{$portion->value}:{$hash}";
    }

    private function store(): Repository
    {
        return Cache::store(config('content.cache_store'));
    }
}
