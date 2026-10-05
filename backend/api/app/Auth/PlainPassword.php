<?php

namespace App\Auth;

use Normalizer;

final readonly class PlainPassword
{
    private function __construct(public string $value) {}

    public static function of(string $raw): self
    {
        $normalized = Normalizer::normalize($raw, Normalizer::FORM_C);

        return new self($normalized === false ? $raw : $normalized);
    }

    public function characters(): int
    {
        return mb_strlen($this->value);
    }

    public function bytes(): int
    {
        return strlen($this->value);
    }
}
