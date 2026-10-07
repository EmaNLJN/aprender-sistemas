<?php

namespace App\Admin;

use App\Auth\AccountStatus;
use App\Auth\Role;

final readonly class UserFilters
{
    public function __construct(
        public int $page,
        public int $perPage,
        public ?string $q,
        public ?Role $role,
        public ?AccountStatus $status,
        public string $sort,
    ) {}
}
