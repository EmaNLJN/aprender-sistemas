<?php

namespace App\Http\Controllers\Admin;

use App\Admin\AdminInvitations;
use App\Admin\InviteOutcome;
use App\Admin\PageMeta;
use App\Admin\PublishedInvitation;
use App\Auth\EmailFingerprint;
use App\Auth\IssuedInvitation;
use App\Auth\Role;
use App\Http\ApiCode;
use App\Http\ApiError;
use App\Http\CurrentAccount;
use App\Http\MailUnavailable;
use App\Http\Middleware\RequirePassword;
use App\Http\Requests\Admin\InviteRequest;
use App\Http\Requests\Admin\ListInvitationsRequest;
use App\Http\Requests\Admin\ResendInvitationRequest;
use App\Models\Invitation;
use App\Models\User;
use App\Support\Iso8601;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

final class InvitationController
{
    public function __construct(private AdminInvitations $invitations) {}

    public function index(ListInvitationsRequest $request): JsonResponse
    {
        $page = $this->filtered($request)
            ->orderByRaw("(role = 'admin' AND expires_at > ?) DESC", [now()->format('Y-m-d H:i:s.v')])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($request->perPage(), ['*'], 'page', $request->page());

        $inviters = User::whereIn('id', $page->getCollection()->pluck('invited_by')->filter()->all())->get()->keyBy('id');
        $published = $page->getCollection()
            ->map(fn (Invitation $invitation) => PublishedInvitation::from($invitation, $inviters->get($invitation->invited_by))->toPublished())
            ->all();

        return response()->json(['data' => $published, 'meta' => PageMeta::of($page)]);
    }

    public function store(InviteRequest $request): JsonResponse
    {
        $role = $request->role();
        $delivery = $request->delivery();
        if ($this->lacksConfirmation($request, $role)) {
            return ApiError::of(ApiCode::PasswordConfirmationRequired);
        }
        $this->requireMailDelivery($delivery);

        $entries = [];
        foreach ($request->emails() as $email) {
            $result = $this->invitations->invite($email, $role, CurrentAccount::of($request)->id);
            Log::info('admin.invitation', [
                'result' => $result->outcome->value,
                'role' => $role->value,
                'delivery' => $delivery,
                'email_hmac' => EmailFingerprint::of($result->email),
            ]);
            $entries[] = $this->entryOf($result->email, $result->outcome, $result->issued);
        }

        return response()->json(['data' => $entries]);
    }

    public function resend(ResendInvitationRequest $request, int $invitation): JsonResponse
    {
        $found = $this->invitations->find($invitation);
        if ($this->lacksConfirmation($request, $found->role)) {
            return ApiError::of(ApiCode::PasswordConfirmationRequired);
        }
        $this->requireMailDelivery($request->delivery() ?? $found->getAttribute('delivery'));

        $issued = $this->invitations->resend($found);
        Log::info('admin.invitation_resent', ['invitation_id' => $invitation, 'role' => $found->role->value]);

        return response()->json(['data' => [
            'id' => $invitation,
            'email' => $found->email,
            'role' => $found->role->value,
            'delivery' => 'link',
            'expiresAt' => Iso8601::utc($issued->invitation->expires_at),
            'url' => $issued->link(),
        ]]);
    }

    public function destroy(int $invitation): Response
    {
        $this->invitations->revoke($this->invitations->find($invitation));
        Log::info('admin.invitation_revoked', ['invitation_id' => $invitation]);

        return response()->noContent();
    }

    /** @return Builder<Invitation> */
    private function filtered(ListInvitationsRequest $request): Builder
    {
        $query = Invitation::query();
        $role = $request->role();
        if ($role !== null) {
            $query->where('role', $role->value);
        }
        if ($request->state() === 'pending') {
            $query->where('expires_at', '>', now());
        }
        if ($request->state() === 'expired') {
            $query->where('expires_at', '<=', now());
        }

        return $query;
    }

    private function lacksConfirmation(Request $request, Role $role): bool
    {
        return $role === Role::Admin && ! RequirePassword::isConfirmed($request);
    }

    private function requireMailDelivery(mixed $delivery): void
    {
        if ($delivery === 'email') {
            throw new MailUnavailable;
        }
    }

    /** @return array{email: string, result: string, expiresAt?: string, url?: string} */
    private function entryOf(string $email, InviteOutcome $outcome, ?IssuedInvitation $issued): array
    {
        if ($issued === null) {
            return ['email' => $email, 'result' => $outcome->value];
        }

        return [
            'email' => $email,
            'result' => $outcome->value,
            'expiresAt' => Iso8601::utc($issued->invitation->expires_at),
            'url' => $issued->link(),
        ];
    }
}
