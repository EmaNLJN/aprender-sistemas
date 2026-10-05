<?php

namespace App\Providers;

use App\Auth\BlockedPasswords;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BlockedPasswords::class, fn () => new BlockedPasswords(config()->string('taller.password_blocklist')));
    }

    public function boot(): void
    {
        //
    }
}
