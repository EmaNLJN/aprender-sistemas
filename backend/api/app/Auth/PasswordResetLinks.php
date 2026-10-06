<?php

namespace App\Auth;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;

final class PasswordResetLinks
{
    /**
     * @throws ResetLinkThrottled when another link was issued less than the throttle ago
     * @throws AccountNotActive when the account is disabled or being deleted
     */
    public function issue(User $user): IssuedResetLink
    {
        if ($user->status !== AccountStatus::Active) {
            throw new AccountNotActive;
        }
        $this->assertNotThrottled($user->email);

        $token = Password::broker()->createToken($user);
        $expiresAt = CarbonImmutable::now()->addMinutes(config()->integer('auth.passwords.users.expire'));

        return new IssuedResetLink(
            rtrim(config()->string('app.url'), '/').'/#restablecer='.$token.'&email='.rawurlencode($user->email),
            $expiresAt,
        );
    }

    private function assertNotThrottled(string $email): void
    {
        $issuedAt = DB::table('password_reset_tokens')->where('email', $email)->value('created_at');
        if (! is_string($issuedAt)) {
            return;
        }

        $secondsLeft = config()->integer('auth.passwords.users.throttle') - (now()->getTimestamp() - Carbon::parse($issuedAt)->getTimestamp());
        if ($secondsLeft > 0) {
            throw new ResetLinkThrottled($secondsLeft);
        }
    }
}
