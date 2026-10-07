<?php

use App\Admin\AdminInvitations;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\Parallel;

it('gives one of two admins who invite the same email at once a created and the other a pending', function (int $round) {
    $first = User::factory()->admin()->create();
    $second = User::factory()->admin()->create();
    $email = "beto{$round}@x.com";

    $tasks = [];
    foreach ([$first->id, $second->id] as $adminId) {
        $tasks[] = fn (): string => app(AdminInvitations::class)->invite($email, Role::Student, $adminId)->outcome->value;
    }
    $outcomes = Parallel::run($tasks);

    sort($outcomes);
    expect($outcomes)->toBe(['created', 'invitation_pending'])
        ->and(DB::table('invitations')->where('email', $email)->count())->toBe(1);
})->with(range(1, 10));
