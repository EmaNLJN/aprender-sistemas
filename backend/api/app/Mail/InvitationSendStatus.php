<?php

namespace App\Mail;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class InvitationSendStatus
{
    public function isCurrent(InvitationRef $ref): bool
    {
        return $this->rowOf($ref)->value('id') !== null;
    }

    public function markSent(InvitationRef $ref): void
    {
        $this->rowOf($ref)->update(['sent_at' => $this->now()]);
    }

    public function markFailed(InvitationRef $ref): void
    {
        $this->rowOf($ref)->update(['send_failed_at' => $this->now()]);
    }

    private function rowOf(InvitationRef $ref): Builder
    {
        return DB::table('invitations')->where('id', $ref->id)->where('token_hash', $ref->tokenHash);
    }

    private function now(): string
    {
        return now()->format('Y-m-d H:i:s.v');
    }
}
