<?php

use Illuminate\Support\Facades\DB;
use Tests\Support\UserDataCoverage;

it('names a table with a user_id column that the registry does not declare, and recovers when it is dropped', function () {
    DB::statement('CREATE TABLE zz_coverage_probe (user_id BIGINT UNSIGNED NOT NULL)');

    try {
        expect(UserDataCoverage::undeclared())->toBe(['zz_coverage_probe']);
    } finally {
        DB::statement('DROP TABLE zz_coverage_probe');
    }

    expect(UserDataCoverage::undeclared())->toBe([]);
});

it('names an undeclared child that references a table of the account', function () {
    DB::statement('CREATE TABLE zz_coverage_child (attempt_id BIGINT UNSIGNED NOT NULL, CONSTRAINT zz_coverage_child_attempt_foreign FOREIGN KEY (attempt_id) REFERENCES attempts (id) ON DELETE CASCADE)');

    try {
        expect(UserDataCoverage::undeclared())->toBe(['zz_coverage_child']);
    } finally {
        DB::statement('DROP TABLE zz_coverage_child');
    }

    expect(UserDataCoverage::undeclared())->toBe([]);
});
