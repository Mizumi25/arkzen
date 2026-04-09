<?php

// ============================================================
// ARKZEN GENERATED FACTORY — CampaignFactory
// Tatemono: only-funds
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-09T07:54:27.264441Z
// ============================================================

namespace Database\Factories\Arkzen\OnlyFunds;

use App\Models\Arkzen\OnlyFunds\Campaign;
use Illuminate\Database\Eloquent\Factories\Factory;

class CampaignFactory extends Factory
{
    protected $model = Campaign::class;

    public function definition(): array
    {
        return [
            'user_id' => fake()->numberBetween(1, 1000),
            'title' => fake()->sentence(3),
            'slug' => fake()->slug(),
            'description' => fake()->paragraph(),
            'goal_amount' => fake()->randomFloat(2, 1, 10000),
            'current_amount' => fake()->randomFloat(2, 1, 10000),
            'image_url' => fake()->url(),
            'status' => fake()->randomElement(['active', 'inactive']),
            'end_date' => fake()->date(),
        ];
    }
}
