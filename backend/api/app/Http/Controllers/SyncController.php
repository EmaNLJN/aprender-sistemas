<?php

namespace App\Http\Controllers;

use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\Requests\SyncBodyRequest;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use App\Progress\Sync\SyncService;
use Illuminate\Http\JsonResponse;

final class SyncController
{
    private const NO_STORE = ['Cache-Control' => 'no-store'];

    public function __invoke(SyncBodyRequest $request, SyncService $service): JsonResponse
    {
        try {
            $outcome = $service->sync(CurrentAccount::of($request)->id, $request->toSyncRequest());
        } catch (EpochMismatch $mismatch) {
            return ApiError::of(ApiCode::EpochMismatch, ['epoch' => $mismatch->epoch, 'revision' => $mismatch->revision], self::NO_STORE);
        } catch (ClientOutdated) {
            return ApiError::of(ApiCode::ClientOutdated, headers: self::NO_STORE);
        }

        return response()->json($outcome->toArray(), headers: self::NO_STORE);
    }
}
