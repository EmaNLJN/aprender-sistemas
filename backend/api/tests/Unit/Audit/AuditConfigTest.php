<?php

use App\Audit\AuditLimits;
use Tests\TestCase;

uses(TestCase::class);

it('defaults to the limits of ADR 0005, the instance and the concurrency of the spec', function () {
    expect(config('audit.instance'))->toBe('auditoria')
        ->and(config('audit.concurrency'))->toBe(4)
        ->and(config('audit.report_directory'))->toBe('/audit')
        ->and(config('audit.limits'))->toBe([
            'compile_ms' => ['rust' => 20000, 'go' => 15000],
            'run_ms' => 10000,
            'compile_memory_mib' => 1024,
            'run_memory_mib' => 256,
            'warning_ratio' => 0.5,
        ])
        ->and(config('audit.retry'))->toBe(['max_rounds' => 10, 'max_wait_seconds' => 30])
        ->and(config('audit.preflight'))->toBe(['connect_timeout' => 5, 'timeout' => 10])
        ->and(config('audit.batch_per_slot'))->toBe(8);
});

it('samples the custom test with one expression that passes and one that fails per language (Q5)', function () {
    expect(config('audit.custom_test_sample'))->toBe([
        'rust' => ['exercise' => 'rust-01', 'passing' => 'energia(5) == 35', 'failing' => 'energia(5) == 36'],
        'go' => ['exercise' => 'go-01', 'passing' => 'Bytes(2) == 2048', 'failing' => 'Bytes(2) == 2049'],
    ]);
});

it('reads the limits of ADR 0005 from the configuration', function () {
    expect(AuditLimits::fromConfig())->toEqual(new AuditLimits(20000, 15000, 10000, 1024, 256, 0.5));
});
