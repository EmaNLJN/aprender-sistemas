<?php

namespace App\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class CurrentSession
{
    public static function end(Request $request): void
    {
        Auth::guard('web')->logoutCurrentDevice();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
