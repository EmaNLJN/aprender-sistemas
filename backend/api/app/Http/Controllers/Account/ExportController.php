<?php

namespace App\Http\Controllers\Account;

use App\Accounts\Export\UserExport;
use App\Http\Controllers\Controller;
use App\Http\CurrentAccount;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedJsonResponse;

final class ExportController extends Controller implements HasMiddleware
{
    public function __construct(private readonly UserExport $export) {}

    /**
     * ThrottleRequests is in the router's priority list and would run before password.confirm,
     * so a request without the confirmed password would spend the quota. A closure keeps its place.
     *
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [new Middleware(fn (Request $request, Closure $next) => app(ThrottleRequests::class)->handle($request, $next, 'export'))];
    }

    public function __invoke(Request $request): StreamedJsonResponse
    {
        $user = CurrentAccount::of($request);
        Log::info('account.exported', ['user_id' => $user->id]);

        return response()->streamJson($this->export->document($user->id), 200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="taller-'.$user->id.'-'.now()->utc()->format('Ymd').'.json"',
            'Cache-Control' => 'no-store',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
