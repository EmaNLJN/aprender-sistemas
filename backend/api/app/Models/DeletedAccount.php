<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Support\Carbon;

/**
 * Larastan reads columns from Schema calls only, and these come from raw DDL.
 *
 * @property int $user_id
 * @property Carbon $user_created_at
 * @property Carbon $deleted_at
 */
final class DeletedAccount extends Model
{
    use Prunable;

    protected $table = 'account_deletions';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    /**
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'user_created_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return self::where('deleted_at', '<=', now()->subDays(config()->integer('taller.ledger_days')));
    }
}
