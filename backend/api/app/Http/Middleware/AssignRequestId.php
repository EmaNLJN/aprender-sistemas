<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = $this->idFrom($request);
        $request->attributes->set('request_id', $requestId);

        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }

    private function idFrom(Request $request): string
    {
        $sent = $request->header('X-Request-Id');
        if (is_string($sent) && preg_match('/^[0-9a-f]{32}$/', $sent) === 1) {
            return $sent;
        }

        return bin2hex(random_bytes(16));
    }
}
