<?php

namespace App\Auth;

use Normalizer;

final class Email
{
    public static function canonical(string $raw): string
    {
        $normalized = Normalizer::normalize(trim($raw), Normalizer::FORM_C);

        return mb_strtolower($normalized === false ? trim($raw) : $normalized);
    }
}
