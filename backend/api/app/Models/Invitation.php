<?php

namespace App\Models;

use App\Auth\Role;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

final class Invitation extends Model
{
    use Prunable;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'expires_at' => 'datetime',
            'sent_at' => 'datetime',
            'send_failed_at' => 'datetime',
        ];
    }

    /**
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return self::where('expires_at', '<=', now()->subDays(30));
    }
}
