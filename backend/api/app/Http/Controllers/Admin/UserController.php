<?php

namespace App\Http\Controllers\Admin;

use App\Admin\PageMeta;
use App\Admin\PublishedAdminUser;
use App\Admin\UserDirectory;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

final class UserController
{
    public function __construct(private UserDirectory $directory) {}

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
}
