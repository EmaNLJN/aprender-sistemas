<?php

namespace App\Accounts;

use App\Admin\AccountChanges;
use App\Admin\LastAdmin;
use App\Jobs\PurgeUserData;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;

final class AccountDeletion
{
    public function __construct(private AccountChanges $changes) {}

    /**
     * @throws LastAdmin
     * @throws ModelNotFoundException
     */
    public function request(int $targetId): User
    {
        $target = $this->changes->beginDeletion($targetId);

        Log::info('account.deletion_requested', ['target_id' => $targetId]);
        PurgeUserData::dispatch($targetId);

        return $target;
    }
}
