<?php

namespace App\Auth;

final class PasswordPolicy
{
    private const MIN_CHARACTERS = 15;

    private const MAX_CHARACTERS = 64;

    private const MAX_BYTES = 72;

    private const MIN_PERSONAL_FRAGMENT = 4;

    public function __construct(private BlockedPasswords $blocked) {}

    /** @return list<PasswordViolation> */
    public function violations(PlainPassword $password, ?string $name, ?string $email): array
    {
        $violations = [];

        if ($password->characters() < self::MIN_CHARACTERS) {
            $violations[] = PasswordViolation::TooShort;
        }
        if ($password->characters() > self::MAX_CHARACTERS) {
            $violations[] = PasswordViolation::TooLong;
        }
        if ($password->bytes() > self::MAX_BYTES) {
            $violations[] = PasswordViolation::TooManyBytes;
        }
        if ($this->blocked->contains($password->value)) {
            $violations[] = PasswordViolation::Blocked;
        }
        if ($this->containsAny($password, $this->emailFragments($email))) {
            $violations[] = PasswordViolation::ContainsEmail;
        }
        if ($this->containsAny($password, [$name])) {
            $violations[] = PasswordViolation::ContainsName;
        }

        return $violations;
    }

    /** @return list<string> */
    private function emailFragments(?string $email): array
    {
        if ($email === null) {
            return [];
        }

        $canonical = Email::canonical($email);

        return [$canonical, strstr($canonical, '@', true) ?: $canonical];
    }

    /** @param  list<string|null>  $fragments */
    private function containsAny(PlainPassword $password, array $fragments): bool
    {
        $lowercased = mb_strtolower($password->value);

        foreach ($fragments as $fragment) {
            $needle = mb_strtolower(trim((string) $fragment));
            if (mb_strlen($needle) >= self::MIN_PERSONAL_FRAGMENT && str_contains($lowercased, $needle)) {
                return true;
            }
        }

        return false;
    }
}
