<?php

namespace Database\Seeders;

use Illuminate\Support\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class ClinicWeeklyScheduleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now()->toDateTimeString();

        $defaults = [
            ['weekday' => 0, 'is_open' => true, 'open_time' => '08:00', 'close_time' => '17:00', 'note' => null],
            ['weekday' => 1, 'is_open' => true, 'open_time' => '08:00', 'close_time' => '17:00', 'note' => null],
            ['weekday' => 2, 'is_open' => true, 'open_time' => '08:00', 'close_time' => '17:00', 'note' => null],
            ['weekday' => 3, 'is_open' => true, 'open_time' => '08:00', 'close_time' => '17:00', 'note' => null],
            ['weekday' => 4, 'is_open' => true, 'open_time' => '08:00', 'close_time' => '17:00', 'note' => null],
            ['weekday' => 5, 'is_open' => true, 'open_time' => '08:00', 'close_time' => '17:00', 'note' => null],
            ['weekday' => 6, 'is_open' => true, 'open_time' => '08:00', 'close_time' => '17:00', 'note' => null],
        ];

        foreach ($defaults as &$day) {
            $day['created_at'] = $now;
            $day['updated_at'] = $now;
        }

        DB::table('clinic_weekly_schedules')->insert($defaults);
    }
}
