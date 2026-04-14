<?php

// ============================================================
// ARKZEN GENERATED FACTORY — ItemFactory
// Tatemono: crud-test
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-14T09:58:05.795961Z
// ============================================================

namespace Database\Factories\Arkzen\CrudTest;

use App\Models\Arkzen\CrudTest\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement(['active', 'inactive']),
            'priority' => fake()->randomElement(['low', 'medium', 'high']),
            'tags' => fake()->word(),
        ];
    }
}
