<?php

// ============================================================
// ARKZEN GENERATED SEEDER — InvoiceArkzenSeeder
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T04:50:36.552767Z
// ============================================================

namespace Database\Seeders\Arkzen;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InvoiceArkzenSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('invoices')->truncate();

        DB::table('invoices')->insert([
            [
                'invoice_number' => 'INV-2024-001',
                'amount' => 5000,
                'status' => 'paid',
                'project_id' => 1,
                'due_date' => '2024-12-31T00:00:00.000Z',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'invoice_number' => 'INV-2024-002',
                'amount' => 3500,
                'status' => 'pending',
                'project_id' => 1,
                'due_date' => '2024-12-31T00:00:00.000Z',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'invoice_number' => 'INV-2024-003',
                'amount' => 12000,
                'status' => 'overdue',
                'project_id' => 2,
                'due_date' => '2024-11-30T00:00:00.000Z',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
