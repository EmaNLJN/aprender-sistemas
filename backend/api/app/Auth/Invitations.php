<?php

namespace App\Auth;

use App\Database\WriteTransaction;
use App\Models\Invitation;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;
use LogicException;

final class Invitations
{
    public function __construct(private AccountPasswords $passwords) {}

    public function issue(string $email, Role $role, ?int $invitedBy): IssuedInvitation
    {
        $canonical = Email::canonical($email);
        if (User::where('email', $canonical)->exists()) {
            throw new EmailTaken;
        }

        $token = InvitationToken::generate();
        $invitation = Invitation::where('email', $canonical)->first();
        $renewed = $invitation !== null;
        $invitation ??= (new Invitation)->forceFill(['email' => $canonical]);
        $invitation->forceFill([
            'role' => $role,
            'delivery' => 'link',
            'token_hash' => InvitationToken::hash($token),
            'invited_by' => $invitedBy,
            'expires_at' => $this->expiryOf($role),
            'sent_at' => null,
            'send_failed_at' => null,
        ])->save();

        return new IssuedInvitation($invitation, $token, $renewed);
    }

    public function lookup(string $token): Invitation
    {
        $invitation = $this->find($token);

        return $this->assertCurrent($invitation);
    }

    public function accept(string $token, string $name, PlainPassword $password, string $privacyVersion): User
    {
        $hash = $this->passwords->hash($password);

        try {
            [$user, $invitedBy] = WriteTransaction::run(function () use ($token, $name, $hash, $privacyVersion) {
                $invitation = $this->assertCurrent($this->find($token, lock: true));
                $user = $this->createAccount($invitation, $name, $hash, $privacyVersion);
                $invitation->delete();

                return [$user, $this->invitedBy($invitation)];
            });
        } catch (UniqueConstraintViolationException) {
            throw new EmailTaken;
        }

        Log::info('invitation.accepted', ['invited_by' => $invitedBy, 'user_id' => $user->id]);

        return $user;
    }

    private function find(string $token, bool $lock = false): Invitation
    {
        if (! InvitationToken::isWellFormed($token)) {
            throw new InvitationNotFound;
        }

        $query = Invitation::where('token_hash', InvitationToken::hash($token));

        return ($lock ? $query->lockForUpdate() : $query)->first() ?? throw new InvitationNotFound;
    }

    private function assertCurrent(Invitation $invitation): Invitation
    {
        if ($this->expiresAt($invitation)->isBefore(Date::now())) {
            throw new InvitationExpired;
        }

        return $invitation;
    }

    private function createAccount(Invitation $invitation, string $name, string $hash, string $privacyVersion): User
    {
        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $this->emailOf($invitation),
            'password' => $hash,
            'role' => $this->roleOf($invitation),
            'status' => AccountStatus::Active,
            'email_verified_at' => Date::now(),
            'privacy_version' => $privacyVersion,
            'privacy_accepted_at' => Date::now(),
        ])->save();

        return $user;
    }

    private function invitedBy(Invitation $invitation): ?int
    {
        $invitedBy = $invitation->getAttribute('invited_by');

        return is_int($invitedBy) ? $invitedBy : null;
    }

    public function expiresAt(Invitation $invitation): CarbonInterface
    {
        $expiresAt = $invitation->getAttribute('expires_at');

        return $expiresAt instanceof CarbonInterface ? $expiresAt : throw new LogicException('An invitation needs an expiry.');
    }

    public function emailOf(Invitation $invitation): string
    {
        $email = $invitation->getAttribute('email');

        return is_string($email) ? $email : throw new LogicException('An invitation needs an email.');
    }

    public function roleOf(Invitation $invitation): Role
    {
        $role = $invitation->getAttribute('role');

        return $role instanceof Role ? $role : throw new LogicException('An invitation needs a role.');
    }

    private function expiryOf(Role $role): CarbonInterface
    {
        if ($role === Role::Admin) {
            return Date::now()->addHours(config()->integer('taller.invitations.admin_hours'));
        }

        return Date::now()->addDays(config()->integer('taller.invitations.student_days'));
    }
}
