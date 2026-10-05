<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

final class AccountPasswords
{
    /** @var array<int, string> */
    private static array $dummyHashesByRounds = [];

    public function hash(PlainPassword $password): string
    {
        return Hash::make($password->value, ['rounds' => $this->rounds()]);
    }

    public function set(User $user, PlainPassword $password): void
    {
        $user->password = $this->hash($password);
    }

    public function verify(User $user, PlainPassword $password): bool
    {
        return Hash::check($password->value, $user->password);
    }

    public function verifyOrDummy(?User $user, PlainPassword $password): bool
    {
        if ($user === null) {
            Hash::check($password->value, $this->dummyHash());

            return false;
        }

        return $this->verify($user, $password);
    }

    public function dummyHash(): string
    {
        $rounds = $this->rounds();

        return self::$dummyHashesByRounds[$rounds] ??= $this->hash(PlainPassword::of(bin2hex(random_bytes(16))));
    }

    public function logoutOtherDevices(PlainPassword $current): void
    {
        Auth::logoutOtherDevices($current->value);
    }

    private function rounds(): int
    {
        return config()->integer('hashing.bcrypt.rounds');
    }
}
