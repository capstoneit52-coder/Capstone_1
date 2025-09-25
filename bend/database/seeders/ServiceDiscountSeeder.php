<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceDiscount;
use Illuminate\Support\Carbon;

class ServiceDiscountSeeder extends Seeder
{
    public function run(): void
    {
        $today = Carbon::today();

        ServiceDiscount::insert([
            [
                'service_id' => 1,
                'start_date' => $today->copy()->addDay()->toDateString(),
                'end_date' => $today->copy()->addDays(3)->toDateString(),
                'discounted_price' => 1500,
                'status' => 'planned',
                'activated_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'service_id' => 1,
                'start_date' => $today->toDateString(),
                'end_date' => $today->copy()->addDays(10)->toDateString(),
                'discounted_price' => 1300,
                'status' => 'launched',
                'activated_at' => $today->copy()->subDay(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'service_id' => 2,
                'start_date' => $today->copy()->subDays(2)->toDateString(),
                'end_date' => $today->copy()->subDay()->toDateString(),
                'discounted_price' => 1200,
                'status' => 'launched',
                'activated_at' => $today->copy()->subDays(2),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'service_id' => 3,
                'start_date' => $today->toDateString(),
                'end_date' => $today->copy()->addDays(5)->toDateString(),
                'discounted_price' => 1400,
                'status' => 'canceled',
                'activated_at' => $today,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
