<?php

namespace App\Admin;

use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

final class LastAdminGuard
{
    /**
     * The active admins are locked before the target so that two concurrent changes queue on the same first row.
     * Runs inside a WriteTransaction.
     *
     * @throws ModelNotFoundException
     */
    public function lock(int $targetId): LockedTarget
    {
        $activeAdmins = User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->lockForUpdate()
            ->get(['id']);
        $target = User::query()->lockForUpdate()->findOrFail($targetId);

        return new LockedTarget($target, $activeAdmins->reject(fn (User $admin) => $admin->is($target))->count());
    }
}
