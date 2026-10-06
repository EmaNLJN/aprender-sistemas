<?php

namespace App\Admin;

use App\Auth\Email;
use App\Auth\InvitationToken;
use App\Auth\IssuedInvitation;
use App\Auth\Role;
use App\Database\WriteTransaction;
use App\Models\Invitation;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Date;

final class AdminInvitations
{
    public function invite(string $email, Role $role, int $adminId): InviteResult
    {
        $canonical = Email::canonical($email);

        try {
            return $this->classify($canonical, $role, $adminId);
        } catch (UniqueConstraintViolationException) {
            return $this->classify($canonical, $role, $adminId);
        }
    }

    public function resend(Invitation $invitation): IssuedInvitation
    {
        return WriteTransaction::run(function () use ($invitation) {
            $locked = Invitation::whereKey($invitation->getKey())->lockForUpdate()->firstOrFail();

            return $this->rotate($locked, $locked->role);
        });
    }

    public function revoke(Invitation $invitation): void
    {
        $invitation->delete();
    }

    /** @throws ModelNotFoundException<Invitation> */
    public function find(int $id): Invitation
    {
        return Invitation::findOrFail($id);
    }

    private function classify(string $email, Role $role, int $adminId): InviteResult
    {
        return WriteTransaction::run(function () use ($email, $role, $adminId) {
            if (User::where('email', $email)->exists()) {
                return new InviteResult($email, InviteOutcome::UserExists, null);
            }

            $invitation = Invitation::where('email', $email)->lockForUpdate()->first();
            if ($invitation === null) {
                return $this->create($email, $role, $adminId);
            }
            if ($invitation->expires_at->isFuture()) {
                return new InviteResult($email, InviteOutcome::Pending, null);
            }

            return new InviteResult($email, InviteOutcome::Renewed, $this->rotate($invitation, $role));
        });
    }

    private function create(string $email, Role $role, int $adminId): InviteResult
    {
        $invitation = (new Invitation)->forceFill(['email' => $email, 'invited_by' => $adminId]);
        $issued = $this->rotate($invitation, $role);

        return new InviteResult($email, InviteOutcome::Created, $issued);
    }

    private function rotate(Invitation $invitation, Role $role): IssuedInvitation
    {
        $token = InvitationToken::generate();
        $invitation->forceFill([
            'role' => $role,
            'delivery' => 'link',
            'token_hash' => InvitationToken::hash($token),
            'expires_at' => $this->expiryOf($role),
            'sent_at' => null,
            'send_failed_at' => null,
        ])->save();

        return new IssuedInvitation($invitation, $token, $invitation->wasRecentlyCreated === false);
    }

    private function expiryOf(Role $role): CarbonInterface
    {
        if ($role === Role::Admin) {
            return Date::now()->addHours(config()->integer('taller.invitations.admin_hours'));
        }

        return Date::now()->addDays(config()->integer('taller.invitations.student_days'));
    }
}
