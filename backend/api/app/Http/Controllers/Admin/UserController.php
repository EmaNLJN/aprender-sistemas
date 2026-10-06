<?php

namespace App\Http\Controllers\Admin;

use App\Admin\AccountBeingDeleted;
use App\Admin\AccountChanges;
use App\Admin\LastAdmin;
use App\Admin\PageMeta;
use App\Admin\PublishedAdminUser;
use App\Admin\RestrictsItself;
use App\Admin\UserDirectory;
use App\Auth\AccountStatus;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class UserController
{
    public function __construct(private UserDirectory $directory, private AccountChanges $changes) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $page = $this->directory->page($request->filters());

        return response()->json([
            'data' => $page->getCollection()->map(fn (User $user) => PublishedAdminUser::from($user)->toPublished())->all(),
            'meta' => PageMeta::of($page),
        ]);
    }

    public function show(int $user): JsonResponse
    {
        return response()->json(['data' => PublishedAdminUser::from($this->directory->find($user))->toPublished()]);
    }

    public function update(UpdateUserRequest $request, int $user): JsonResponse
    {
        try {
            $changed = $this->changes->change(CurrentAccount::of($request), $user, $request->role(), $request->status());
        } catch (RestrictsItself) {
            $field = $request->status() === AccountStatus::Disabled ? 'status' : 'role';

            return $this->invalid($field, __('admin.restricts_itself.'.$field));
        } catch (AccountBeingDeleted) {
            return $this->invalid($request->status() === null ? 'role' : 'status', __('admin.being_deleted'));
        } catch (LastAdmin) {
            return ApiError::of(ApiCode::LastAdmin);
        }

        return response()->json(['data' => PublishedAdminUser::from($changed)->toPublished()]);
    }

    private function invalid(string $field, string $message): JsonResponse
    {
        return ApiError::of(ApiCode::ValidationFailed, ['errors' => [$field => [$message]]]);
    }
}
