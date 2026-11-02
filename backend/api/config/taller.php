<?php

return [

    'privacy_version' => env('PRIVACY_VERSION', '2026-10-dev'),

    'password_blocklist' => env('PASSWORD_BLOCKLIST_PATH', resource_path('passwords/blocked-15plus.txt')),

    'invitations' => ['student_days' => 7, 'admin_hours' => 48, 'prune_days' => 30],

    'session_max_hours' => (int) env('SESSION_MAX_HOURS', 8),

    'device_cookie' => [
        'name' => env('DEVICE_COOKIE_NAME', 'taller-device'),
        'secure' => filter_var(env('DEVICE_COOKIE_SECURE', false), FILTER_VALIDATE_BOOLEAN),
        'same_site' => 'lax',
        'days' => 180,
    ],

    'mail' => [
        'required' => filter_var(env('MAIL_REQUIRED', true), FILTER_VALIDATE_BOOLEAN),
        'retry_seconds' => (int) env('MAIL_RETRY_SECONDS', 86400),
        'backoff' => collect(explode(',', (string) env('MAIL_BACKOFF', '60,300,900,3600')))->map(fn (string $seconds) => (int) $seconds)->all(),
        'admin_daily_limit' => 300,
        'timezone' => 'America/Argentina/Buenos_Aires',
    ],

    'registration' => [
        'open' => filter_var(env('REGISTRATION_OPEN', false), FILTER_VALIDATE_BOOLEAN),
        'allowed_domains' => collect(explode(',', (string) env('REGISTRATION_ALLOWED_DOMAINS', '')))
            ->map(fn (string $domain) => strtolower(trim($domain)))
            ->filter()
            ->values()
            ->all(),
        'per_hour_network' => 5,
        'per_hour_global' => 100,
        'verification_per_hour' => 3,
        'verification_minutes' => 60,
        'unverified_days' => 7,
    ],

    'forgot_password' => ['per_minute_network' => 5, 'per_hour_network' => 20, 'per_hour_email' => 3],

    'ledger_days' => 35,

    'purge' => ['batch_size' => 500, 'stuck_minutes' => 15],

    'export' => ['chunk' => 100],

    'long_transaction_seconds' => (int) env('LONG_TRANSACTION_SECONDS', 30),

    'log_hmac_key' => env('LOG_HMAC_KEY'),

];
