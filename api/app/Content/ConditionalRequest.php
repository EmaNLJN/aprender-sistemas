<?php

namespace App\Content;

use Illuminate\Http\Request;

/** `If-None-Match` contra el ETag actual, con comparación débil (RFC 9110 §13.1.2). */
final class ConditionalRequest
{
    /**
     * Nginx debilita el ETag al comprimir (`W/"…"`) y el navegador lo reenvía así: el prefijo `W/`
     * no cuenta. `*` coincide con cualquier representación que exista.
     */
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
