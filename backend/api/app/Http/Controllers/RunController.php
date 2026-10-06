<?php

namespace App\Http\Controllers;

use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\Requests\SubmitRunRequest;
use App\Runs\Admission\QuotaKind;
use App\Runs\Admission\Rejection;
use App\Runs\Admission\RejectionKind;
use App\Runs\Admission\RunAdmission;
use App\Runs\Admission\RunRejected;
use App\Runs\CancelOutcome;
use App\Runs\Execution\RunCanceller;
use App\Runs\RunLog;
use App\Runs\RunPresenter;
use App\Runs\RunReader;
use App\Runs\RunView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RunController
{
    public function __construct(
        private RunAdmission $admission,
        private RunReader $reader,
        private RunPresenter $presenter,
        private RunCanceller $canceller,
    ) {}

    public function store(SubmitRunRequest $request): JsonResponse
    {
        $userId = CurrentAccount::of($request)->id;
        $submitted = $request->toSubmittedRun();
        try {
            $result = $this->admission->admit($userId, $submitted);
        } catch (RunRejected $rejected) {
            $code = $this->codeOf($rejected->rejection);
            RunLog::rejected($userId, $submitted->exerciseId, $code->value);

            return $this->rejectionResponse($rejected->rejection, $code);
        }

        return $this->respond($this->reader->view($result->run), $result->created ? 202 : 200);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $view = $this->reader->find(CurrentAccount::of($request)->id, $id);

        return $view === null ? ApiError::of(ApiCode::NotFound) : $this->respond($view, 200);
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $userId = CurrentAccount::of($request)->id;
        $outcome = $this->canceller->cancel($userId, $id);
        $view = $outcome === CancelOutcome::NotFound ? null : $this->reader->find($userId, $id);
        if ($view === null) {
            return ApiError::of(ApiCode::NotFound);
        }

        return $this->respond($view, $outcome === CancelOutcome::Requested ? 202 : 200);
    }

    private function respond(RunView $view, int $status): JsonResponse
    {
        return response()->json(['data' => $this->presenter->present($view)], $status);
    }

    private function codeOf(Rejection $rejection): ApiCode
    {
        return match ($rejection->kind) {
            RejectionKind::UnknownExercise => ApiCode::ValidationFailed,
            RejectionKind::ClientRunIdReused => ApiCode::ClientRunIdReused,
            RejectionKind::AccountDisabled => ApiCode::AccountDisabled,
            RejectionKind::Quota => ApiCode::QuotaExceeded,
            RejectionKind::QueueFull => ApiCode::QueueFull,
        };
    }

    private function rejectionResponse(Rejection $rejection, ApiCode $code): JsonResponse
    {
        return match ($rejection->kind) {
            RejectionKind::UnknownExercise => ApiError::of($code, ['errors' => ['exerciseId' => ['El ejercicio no existe o está retirado.']]]),
            RejectionKind::Quota => $this->quotaResponse($rejection, $code),
            RejectionKind::QueueFull => ApiError::of($code, headers: $this->retryAfter($rejection)),
            RejectionKind::ClientRunIdReused, RejectionKind::AccountDisabled => ApiError::of($code),
        };
    }

    private function quotaResponse(Rejection $rejection, ApiCode $code): JsonResponse
    {
        $quota = $rejection->quota ?? QuotaKind::Active;

        return ApiError::response(
            $code->status(),
            $code->value,
            __("api.quota.{$quota->value}"),
            ['quota' => $quota->value],
            $this->retryAfter($rejection),
        );
    }

    /** @return array<string, string> */
    private function retryAfter(Rejection $rejection): array
    {
        return $rejection->retryAfterSeconds === null ? [] : ['Retry-After' => (string) $rejection->retryAfterSeconds];
    }
}
