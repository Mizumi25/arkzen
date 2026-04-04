<?php

// ============================================================
// ARKZEN GENERATED SEEDER — ProjectArkzenSeeder
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-04T01:29:21.752200Z
// ============================================================

namespace Database\Seeders\Arkzen;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProjectArkzenSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('projects')->truncate();

        DB::table('projects')->insert([
            [
                'name' => 'Website Redesign',
                'description' => 'Complete overhaul of company website',
                'status' => 'active',
                'priority' => 'high',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Mobile App Development',
                'description' => 'iOS and Android mobile application',
                'status' => 'active',
                'priority' => 'high',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'CRM Integration',
                'description' => 'Connect existing systems with new CRM',
                'status' => 'planning',
                'priority' => 'medium',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Data Migration',
                'description' => 'Migrate legacy data to new system',
                'status' => 'on_hold',
                'priority' => 'low',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
