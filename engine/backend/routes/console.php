<?php

use Illuminate\Support\Facades\Schedule;

// ============================================================
// ARKZEN AUTO-REGISTERED SCHEDULES
// DO NOT EDIT DIRECTLY. Arkzen manages this file.
// ============================================================


Schedule::command('scheduler-test:cleanup-temp')->cron('0 * * * *'); // [scheduler-test]

Schedule::command('scheduler-test:generate-report')->cron('0 8 * * *'); // [scheduler-test]
