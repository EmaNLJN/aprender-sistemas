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
use App\Auth\Role;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\MailUnavailable;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Log;

final class UserController
{
    public function __construct(private UserDirectory $directory, private AccountChanges $changes) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $page = $this->directory->page($request->filters());

        return response()->json([
            'data' => $page->getCollection()->map(fn (User $user) => PublishedAdminUser::from($user)->toPublished())->all(),
            'meta' => $this->metaOf($page),
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

    public function passwordReset(int $user): JsonResponse
    {
        $target = $this->directory->find($user);
        if ($target->role === Role::Admin) {
            return $this->invalid('user', __('admin.password_reset.admin'));
        }
        if ($target->status !== AccountStatus::Active) {
            return $this->invalid('user', __('admin.password_reset.not_active'));
        }

        Log::info('admin.password_reset_refused', ['target_id' => $user, 'reason' => 'mail_unavailable']);

        throw new MailUnavailable;
    }

    /**
     * @param  LengthAwarePaginator<int, User>  $page
     * @return array{page: int, perPage: int, total: int, lastPage: int}
     */
    private function metaOf(LengthAwarePaginator $page): array
    {
        /** @var array<array-key, mixed> $items */
        $items = [];

        return PageMeta::of(new LengthAwarePaginator($items, $page->total(), $page->perPage(), $page->currentPage()));
    }

    private function invalid(string $field, string $message): JsonResponse
    {
        return ApiError::of(ApiCode::ValidationFailed, ['errors' => [$field => [$message]]]);
    }
}
