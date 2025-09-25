<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class ServiceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Service::insert([
            [
                'name' => 'Dental Cleaning',
                'description' => 'Basic oral prophylaxis procedure',
                'price' => 2500,
                'category' => 'Preventive',
                'is_excluded_from_analytics' => false,
                'estimated_minutes' => 30,
                'is_special' => false,
                'special_start_date' => null,
                'special_end_date' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Tooth Extraction',
                'description' => 'Simple or surgical removal of tooth',
                'price' => 3000,
                'category' => 'Restorative',
                'is_excluded_from_analytics' => true,
                'estimated_minutes' => 60,
                'is_special' => false,
                'special_start_date' => null,
                'special_end_date' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Tooth Filling',
                'description' => 'Resin composite filling for cavities',
                'price' => 2000,
                'category' => 'Restorative',
                'is_excluded_from_analytics' => false,
                'estimated_minutes' => 45,
                'is_special' => false,
                'special_start_date' => null,
                'special_end_date' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Whitening + Cleaning Package',
                'description' => 'Limited-time package: Cleaning plus teeth whitening',
                'price' => 4500,
                'category' => 'Cosmetic',
                'is_excluded_from_analytics' => false,
                'estimated_minutes' => 90,
                'is_special' => true,
                'special_start_date' => now()->subDays(2)->toDateString(),
                'special_end_date' => now()->addDays(5)->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
