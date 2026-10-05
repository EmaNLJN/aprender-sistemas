<?php

namespace App\Content;

use Illuminate\Http\Request;

/**
 * `If-None-Match` against the current ETag, with weak comparison (RFC 9110 §13.1.2): Nginx turns the
 * ETag into `W/"…"` when it compresses, and the browser sends it back that way.
 */
final class ConditionalRequest
{
    public static function matches(Request $request, string $etag): bool
    {
        $header = $request->headers->get('If-None-Match');
        if ($header === null) {
            return false;
        }
        if (trim($header) === '*') {
            return true;
        }
        foreach (explode(',', $header) as $candidate) {
            $candidate = trim($candidate);
            if (str_starts_with($candidate, 'W/')) {
                $candidate = substr($candidate, 2);
            }
            if ($candidate === $etag) {
                return true;
            }
        }

        return false;
    }
}
