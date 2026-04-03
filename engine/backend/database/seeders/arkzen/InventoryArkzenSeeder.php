<?php

// ============================================================
// ARKZEN GENERATED SEEDER — InventoryArkzenSeeder
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-01T11:37:12.046737Z
// ============================================================

namespace Database\Seeders\Arkzen;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InventoryArkzenSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing data first
        DB::table('inventories')->truncate();

        DB::table('inventories')->insert([
            [
                'name' => 'Wireless Keyboard',
                'sku' => 'WK-001',
                'quantity' => 50,
                'price' => 1299,
                'category' => 'Electronics',
                'description' => 'Compact wireless keyboard',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'USB Hub 4-Port',
                'sku' => 'UH-001',
                'quantity' => 120,
                'price' => 450,
                'category' => 'Electronics',
                'description' => '4-port USB 3.0 hub',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Notebook A5',
                'sku' => 'NB-001',
                'quantity' => 200,
                'price' => 85,
                'category' => 'Stationery',
                'description' => 'A5 lined notebook',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Office Chair',
                'sku' => 'OC-001',
                'quantity' => 15,
                'price' => 8500,
                'category' => 'Furniture',
                'description' => 'Ergonomic office chair',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Monitor Stand',
                'sku' => 'MS-001',
                'quantity' => 30,
                'price' => 750,
                'category' => 'Furniture',
                'description' => 'Adjustable monitor stand',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
