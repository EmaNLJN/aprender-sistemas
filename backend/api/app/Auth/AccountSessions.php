<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AccountSessions
{
    public const PASSWORD_HASH_KEY = 'password_hash_web';

    public function __construct(private AccountPasswords $passwords) {}

    public function endAll(User $user): void
    {
        DB::table('sessions')->where('user_id', $user->id)->delete();
        $this->rotateRememberToken($user);
    }

    /**
     * `$user` is the account of this request. The remember token rotates first so that `logoutOtherDevices`,
     * which reissues this device's remember cookie when it had one, writes the new token. The session's
     * password hash is forgotten so DropInvalidSession stores the new one after the request.
     */
    public function endOthers(User $user, Request $request, PlainPassword $current): void
    {
        $this->rotateRememberToken($user);
        $this->passwords->logoutOtherDevices($current);
        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();
        $request->session()->forget(self::PASSWORD_HASH_KEY);
    }

    private function rotateRememberToken(User $user): void
    {
        $user->setRememberToken(Str::random(60));
        $user->save();
    }
}
