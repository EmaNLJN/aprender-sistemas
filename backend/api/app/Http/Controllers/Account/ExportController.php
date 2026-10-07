<?php

namespace App\Http\Controllers\Account;

use App\Accounts\Export\UserExport;
use App\Http\Controllers\Controller;
use App\Http\CurrentAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedJsonResponse;

final class ExportController extends Controller
{
    public function __construct(private readonly UserExport $export) {}

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
