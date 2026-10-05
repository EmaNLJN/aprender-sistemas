<?php

namespace App\Models;

use App\Auth\AccountStatus;
use App\Auth\Role;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * Larastan reads columns from Schema calls only, and these come from raw DDL.
 *
 * @property Role $role
 * @property AccountStatus $status
 * @property string|null $privacy_version
 * @property Carbon|null $privacy_accepted_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $attributes = [
        'role' => 'student',
        'status' => 'active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'privacy_accepted_at' => 'datetime',
            'role' => Role::class,
            'status' => AccountStatus::class,
            'password' => 'hashed',
        ];
    }
}
