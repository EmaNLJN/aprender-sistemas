<?php

namespace App\Accounts\Export;

use Illuminate\Support\Facades\DB;

final class AccountSection implements ExportSection
{
    private const COLUMNS = ['id', 'name', 'email', 'role', 'email_verified_at', 'privacy_version', 'privacy_accepted_at', 'created_at', 'updated_at'];

    public function key(): string
    {
        return 'account';
    }

    /** @return array<string, mixed> */
    public function read(int $userId): array
    {
        $row = DB::table('users')->select(self::COLUMNS)->where('id', $userId)->first();

        return $row === null ? [] : RowShape::of(get_object_vars($row), RowShape::dateColumnsOf('users'), []);
    }
}
