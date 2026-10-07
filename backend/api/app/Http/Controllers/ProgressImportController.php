<?php

namespace App\Http\Controllers;

use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\Requests\ImportBodyRequest;
use App\Progress\Import\ImportNeedsConfirmation;
use App\Progress\Import\ImportService;
use App\Progress\Import\ImportWriteFailed;
use App\Progress\Sync\ClientOutdated;
use App\Progress\Sync\EpochMismatch;
use Illuminate\Http\JsonResponse;

final class ProgressImportController
{
    public function __invoke(ImportBodyRequest $request, ImportService $service): JsonResponse
    {
        try {
            $outcome = $service->import(CurrentAccount::of($request)->id, $request->toImportRequest());
        } catch (EpochMismatch $mismatch) {
            return ApiError::of(ApiCode::EpochMismatch, ['epoch' => $mismatch->epoch, 'revision' => $mismatch->revision]);
        } catch (ClientOutdated) {
            return ApiError::of(ApiCode::ClientOutdated);
        } catch (ImportNeedsConfirmation) {
            return ApiError::of(ApiCode::ImportNeedsConfirmation);
        } catch (ImportWriteFailed) {
            return ApiError::of(ApiCode::ServerError);
        }

        return response()->json($outcome->toArray(), $outcome->status());
    }
}
