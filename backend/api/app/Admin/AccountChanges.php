<?php

namespace App\Admin;

use App\Auth\AccountSessions;
use App\Auth\AccountStatus;
use App\Auth\Events\AccountRestricted;
use App\Auth\Events\AccountRestriction;
use App\Auth\Role;
use App\Database\WriteTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AccountChanges
{
    public function __construct(private LastAdminGuard $guard, private AccountSessions $sessions) {}

    /**
     * @throws RestrictsItself
     * @throws ModelNotFoundException
     * @throws AccountBeingDeleted
     * @throws LastAdmin
     */
    public function change(User $actor, int $targetId, ?Role $role, ?AccountStatus $status): User
    {
        $this->refuseSelfRestriction($actor, $targetId, $role, $status);

        [$target, $restrictions] = WriteTransaction::run(fn () => $this->applyChange($targetId, $role, $status));

        foreach ($restrictions as $restriction) {
            event(new AccountRestricted($targetId, $restriction));
        }

        return $target;
    }

    /**
     * @throws ModelNotFoundException
     * @throws LastAdmin
     */
    public function beginDeletion(int $targetId, bool $guardLastAdmin = true): User
    {
        [$target, $restrictions] = WriteTransaction::run(fn () => $this->applyDeletion($targetId, $guardLastAdmin));

        foreach ($restrictions as $restriction) {
            event(new AccountRestricted($targetId, $restriction));
        }

        return $target;
    }

    private function refuseSelfRestriction(User $actor, int $targetId, ?Role $role, ?AccountStatus $status): void
    {
        $restrictsItself = $status === AccountStatus::Disabled || $role === Role::Student;
        if ($actor->getKey() === $targetId && $restrictsItself) {
            throw new RestrictsItself;
        }
    }

    /** @return array{User, list<AccountRestriction>} */
    private function applyChange(int $targetId, ?Role $role, ?AccountStatus $status): array
    {
        $locked = $this->guard->lock($targetId);
        $target = $locked->user;
        if ($target->status === AccountStatus::Deleting) {
            throw new AccountBeingDeleted;
        }

        $newRole = $role ?? $target->role;
        $newStatus = $status ?? $target->status;
        if ($newRole === $target->role && $newStatus === $target->status) {
            return [$target, []];
        }

        $wasActiveAdmin = $target->role === Role::Admin && $target->status === AccountStatus::Active;
        $staysActiveAdmin = $newRole === Role::Admin && $newStatus === AccountStatus::Active;
        if ($wasActiveAdmin && ! $staysActiveAdmin && $locked->otherActiveAdmins === 0) {
            throw new LastAdmin;
        }

        $becomesDisabled = $newStatus === AccountStatus::Disabled && $target->status !== AccountStatus::Disabled;
        $leavesAdmin = $target->role === Role::Admin && $newRole === Role::Student;
        $becomesAdmin = $target->role === Role::Student && $newRole === Role::Admin;

        $target->forceFill(['role' => $newRole, 'status' => $newStatus]);
        if ($becomesAdmin) {
            $target->setRememberToken(Str::random(60));
        }
        $target->save();

        if ($becomesDisabled) {
            $this->dropRecoveryToken($target);
        }
        if ($leavesAdmin || ($becomesDisabled && $wasActiveAdmin)) {
            $this->dropInvitationsCreatedBy($target);
        }

        return [$target, $this->restrictionsOf($becomesDisabled, $leavesAdmin)];
    }

    /** @return array{User, list<AccountRestriction>} */
    private function applyDeletion(int $targetId, bool $guardLastAdmin): array
    {
        $locked = $this->guard->lock($targetId);
        $target = $locked->user;
        if ($target->status === AccountStatus::Deleting) {
            return [$target, []];
        }

        $isActiveAdmin = $target->role === Role::Admin && $target->status === AccountStatus::Active;
        if ($guardLastAdmin && $isActiveAdmin && $locked->otherActiveAdmins === 0) {
            throw new LastAdmin;
        }

        $target->forceFill(['status' => AccountStatus::Deleting]);
        $target->save();
        $this->sessions->endAll($target);
        $this->dropRecoveryToken($target);
        $this->dropInvitationsCreatedBy($target);
        DB::table('invitations')->where('email', $target->email)->delete();

        return [$target, [AccountRestriction::Deleting]];
    }

    /** @return list<AccountRestriction> */
    private function restrictionsOf(bool $becomesDisabled, bool $leavesAdmin): array
    {
        $restrictions = [];
        if ($becomesDisabled) {
            $restrictions[] = AccountRestriction::Disabled;
        }
        if ($leavesAdmin) {
            $restrictions[] = AccountRestriction::Demoted;
        }

        return $restrictions;
    }

    private function dropRecoveryToken(User $target): void
    {
        DB::table('password_reset_tokens')->where('email', $target->email)->delete();
    }

    private function dropInvitationsCreatedBy(User $target): void
    {
        DB::table('invitations')->where('invited_by', $target->getKey())->delete();
    }
}
