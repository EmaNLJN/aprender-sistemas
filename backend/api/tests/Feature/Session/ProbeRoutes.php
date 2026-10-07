<?php

namespace Tests\Feature\Session;

use App\Auth\AccountSessions;
use App\Auth\PlainPassword;
use App\Http\Middleware\RequirePassword;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

final class ProbeRoutes
{
    public static function register(): void
    {
        Route::middleware('api')->prefix('api')->group(function () {
            Route::get('/probe/public', fn () => response()->json(['id' => Auth::id()]));
            Route::post('/probe/public', fn () => response()->json(['id' => Auth::id()]));
            Route::get('/probe/account', fn () => response()->json(['id' => Auth::id()]))->middleware('account');
            Route::post('/probe/account', fn () => response()->json(['id' => Auth::id()]))->middleware('account');
            Route::match(['PUT', 'PATCH', 'DELETE'], '/probe/account', fn () => response()->json(['id' => Auth::id()]))->middleware('account');
            Route::post('/probe/put-session', function () {
                session()->put(request()->string('key')->toString(), request()->integer('value'));

                return response()->noContent();
            });
            Route::get('/probe/is-confirmed', fn () => response()->json(['confirmed' => RequirePassword::isConfirmed(request())]));
            Route::post('/probe/mark-confirmed', function () {
                RequirePassword::markConfirmed(request());

                return response()->noContent();
            });
            Route::post('/probe/end-others', function () {
                $user = Auth::user();
                assert($user instanceof User);
                app(AccountSessions::class)->endOthers($user, request(), PlainPassword::of(request()->string('password')->toString()));

                return response()->noContent();
            })->middleware('account');
            Route::post('/probe/end-all', function () {
                app(AccountSessions::class)->endAll(User::findOrFail(request()->integer('id')));

                return response()->noContent();
            });
            Route::get('/probe/study', fn () => response()->json(['id' => Auth::id()]))->middleware(['account', 'verified']);
            Route::get('/probe/sensitive', fn () => response()->json(['id' => Auth::id()]))->middleware(['account', 'password.confirm']);
            Route::get('/probe/request-id', fn () => response()->json(['id' => request()->attributes->get('request_id')]));
            Route::get('/probe/authenticated-at', fn () => response()->json(['at' => session('taller.authenticated_at')]));
            Route::get('/probe/dropped', fn () => response()->json(['reason' => request()->attributes->get('session.dropped')?->value]));
        });
    }
}
