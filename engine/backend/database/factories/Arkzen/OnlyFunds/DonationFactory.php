<?php

// ============================================================
// ARKZEN GENERATED FACTORY — DonationFactory
// Tatemono: only-funds
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-12T00:12:06.947078Z
// ============================================================

namespace Database\Factories\Arkzen\OnlyFunds;

use App\Models\Arkzen\OnlyFunds\Donation;
use Illuminate\Database\Eloquent\Factories\Factory;

class DonationFactory extends Factory
{
    protected $model = Donation::class;

    public function definition(): array
    {
        return [
            'campaign_id' => fake()->numberBetween(1, 1000),
            'user_id' => fake()->numberBetween(1, 1000),
            'donor_name' => fake()->name(),
            'donor_email' => fake()->unique()->safeEmail(),
            'amount' => fake()->randomFloat(2, 1, 10000),
            'message' => fake()->paragraph(),
            'is_anonymous' => fake()->boolean(),
            'payment_status' => fake()->randomElement(['active', 'inactive']),
        ];
    }
}
