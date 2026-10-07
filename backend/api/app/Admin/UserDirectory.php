<?php

namespace App\Admin;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Pagination\LengthAwarePaginator;

final class UserDirectory
{
    private const SORT_COLUMNS = [
        'name' => 'name',
        'email' => 'email',
        'role' => 'role',
        'status' => 'status',
        'createdAt' => 'created_at',
    ];

    /** @return LengthAwarePaginator<int, User> */
    public function page(UserFilters $filters): LengthAwarePaginator
    {
        $query = User::query();
        if ($filters->q !== null) {
            $this->matching($query, $filters->q);
        }
        if ($filters->role !== null) {
            $query->where('role', $filters->role->value);
        }
        if ($filters->status !== null) {
            $query->where('status', $filters->status->value);
        }

        return $this->sorted($query, $filters->sort)->paginate(perPage: $filters->perPage, page: $filters->page);
    }

    /** @throws ModelNotFoundException */
    public function find(int $id): User
    {
        return User::query()->findOrFail($id);
    }

    /** @param  Builder<User>  $query */
    private function matching(Builder $query, string $text): void
    {
        $pattern = '%'.addcslashes($text, '\\%_').'%';
        $query->where(fn ($either) => $either->where('name', 'like', $pattern)->orWhere('email', 'like', $pattern));
    }

    /**
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    private function sorted(Builder $query, string $sort): Builder
    {
        $descending = str_starts_with($sort, '-');
        $column = self::SORT_COLUMNS[ltrim($sort, '-')];

        return $query->orderBy($column, $descending ? 'desc' : 'asc')->orderBy('id');
    }
}
