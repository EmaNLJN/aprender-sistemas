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

    'features' => ['password_reset' => false, 'registration' => false],

    'long_transaction_seconds' => (int) env('LONG_TRANSACTION_SECONDS', 30),

    'log_hmac_key' => env('LOG_HMAC_KEY'),

];
