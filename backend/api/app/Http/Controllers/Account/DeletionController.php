<?php

namespace App\Http\Controllers\Account;

use App\Accounts\AccountDeletion;
use App\Admin\LastAdmin;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class DeletionController
{
    public function __construct(private AccountDeletion $deletion) {}

    public function destroyOwn(Request $request): JsonResponse
    {
        $ownId = CurrentAccount::of($request)->id;

        try {
            $this->deletion->request($ownId);
        } catch (LastAdmin) {
            return ApiError::of(ApiCode::LastAdmin);
        }
        $this->endSessionOf($request);

        return response()->json(['data' => ['status' => 'deleting'], 'message' => __('account.deletion.own')], 202);
    }

    public function destroyUser(Request $request, int $user): JsonResponse
    {
        try {
            $this->deletion->request($user);
        } catch (LastAdmin) {
            return ApiError::of(ApiCode::LastAdmin);
        }
        if ($user === CurrentAccount::of($request)->id) {
            $this->endSessionOf($request);
        }

        return response()->json(['data' => ['id' => $user, 'status' => 'deleting'], 'message' => __('account.deletion.other')], 202);
    }

    private function endSessionOf(Request $request): void
    {
        Auth::guard('web')->logoutCurrentDevice();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
