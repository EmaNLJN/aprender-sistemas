<?php

namespace App\Http\Controllers;

use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\Requests\ResetBodyRequest;
use App\Progress\Reset\ProgressReset;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use Illuminate\Http\JsonResponse;

final class ProgressResetController
{
    public function __invoke(ResetBodyRequest $request, ProgressReset $reset): JsonResponse
    {
        try {
            $outcome = $reset->reset(CurrentAccount::of($request)->id, $request->toResetRequest());
        } catch (EpochMismatch $mismatch) {
            return ApiError::of(ApiCode::EpochMismatch, ['epoch' => $mismatch->epoch, 'revision' => $mismatch->revision]);
        } catch (ClientOutdated) {
            return ApiError::of(ApiCode::ClientOutdated);
        }

        return response()->json($outcome->toArray());
    }
}
