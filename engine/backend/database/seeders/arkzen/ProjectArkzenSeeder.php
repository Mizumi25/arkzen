<?php

// ============================================================
// ARKZEN GENERATED SEEDER — ProjectArkzenSeeder
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T07:08:11.801260Z
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
                'description' => 'Complete website overhaul with new design system',
                'status' => 'active',
                'progress' => 65,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Mobile App Development',
                'description' => 'iOS and Android mobile application',
                'status' => 'active',
                'progress' => 30,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'CRM Integration',
                'description' => 'Connect existing systems with new CRM',
                'status' => 'planning',
                'progress' => 10,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}
