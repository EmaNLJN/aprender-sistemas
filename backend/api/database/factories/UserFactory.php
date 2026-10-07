<?php

namespace Database\Factories;

use App\Auth\AccountStatus;
use App\Auth\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => Role::Student,
            'status' => AccountStatus::Active,
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => Role::Admin]);
    }

    public function disabled(): static
    {
        return $this->state(fn (array $attributes) => ['status' => AccountStatus::Disabled]);
    }

    public function deleting(): static
    {
        return $this->state(fn (array $attributes) => ['status' => AccountStatus::Deleting]);
    }

    public function withPassword(string $plain): static
    {
        return $this->state(fn (array $attributes) => ['password' => $plain]);
    }
}
