<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientVisit;
use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ReportSeeder extends Seeder
{
    /**
     * Seed data to test monthly reports.
     */
    public function run(): void
    {
        $now = Carbon::now();
        $startOfMonth = (clone $now)->startOfMonth();
        $endOfMonth = (clone $now)->endOfMonth();

        // Ensure there are patients and services
        $patients = Patient::query()->pluck('id')->all();
        $services = Service::query()->where('is_active', true)->pluck('id')->all();

        if (empty($patients)) {
            $this->command?->warn('No patients found; skipping ReportSeeder');
            return;
        }
        if (empty($services)) {
            $this->command?->warn('No services found; skipping ReportSeeder');
            return;
        }

        // Clear existing visits for the month to avoid duplication when re-seeding
        PatientVisit::whereBetween('start_time', [$startOfMonth, $endOfMonth])->delete();

        $numDays = (int) $startOfMonth->diffInDays($endOfMonth) + 1;
        $statuses = ['pending', 'completed', 'rejected'];

        $visitRows = [];
        $appointmentRows = [];

        // Create 6-16 visits per day, random services, and some null service_id
        for ($d = 0; $d < $numDays; $d++) {
            $day = (clone $startOfMonth)->addDays($d);
            $visitsToday = random_int(6, 16);

            for ($i = 0; $i < $visitsToday; $i++) {
                $patientId = $patients[array_rand($patients)];
                $hasService = random_int(0, 9) !== 0; // ~10% unspecified service
                $serviceId = $hasService ? $services[array_rand($services)] : null;

                // Random hour within clinic hours 08:00-18:00
                $hour = random_int(8, 17);
                $minute = [0, 15, 30, 45][array_rand([0,1,2,3])];
                $startAt = (clone $day)->setTime($hour, $minute, 0);
                $status = $statuses[array_rand($statuses)];

                $endAt = null;
                if ($status !== 'pending') {
                    $endAt = (clone $startAt)->addMinutes(random_int(20, 120));
                }

                $visitRows[] = [
                    'patient_id' => $patientId,
                    'service_id' => $serviceId,
                    'visit_date' => $day->toDateString(),
                    'start_time' => $startAt->toDateTimeString(),
                    'end_time' => $endAt?->toDateTimeString(),
                    'status' => $status,
                    'note' => null,
                    'created_at' => $startAt->toDateTimeString(),
                    'updated_at' => $endAt?->toDateTimeString() ?? $startAt->toDateTimeString(),
                ];

                // Create an appointment for ~40% of visits that have a service
                if ($serviceId && random_int(0, 9) < 4) {
                    $appointmentStatus = ['approved', 'completed'][random_int(0, 1)];
                    $appointmentRows[] = [
                        'patient_id' => $patientId,
                        'service_id' => $serviceId,
                        'patient_hmo_id' => null,
                        'date' => $day->toDateString(),
                        'time_slot' => sprintf('%02d:%02d-%02d:%02d', $hour, $minute, min($hour + 1, 23), $minute),
                        'reference_code' => null,
                        'status' => $appointmentStatus,
                        'payment_method' => 'cash',
                        'payment_status' => 'unpaid',
                        'notes' => null,
                        'canceled_at' => null,
                        'reminded_at' => null,
                        'created_at' => $startAt->toDateTimeString(),
                        'updated_at' => $startAt->toDateTimeString(),
                    ];
                }
            }
        }

        // Bulk insert for performance
        foreach (array_chunk($visitRows, 1000) as $chunk) {
            PatientVisit::insert($chunk);
        }
        foreach (array_chunk($appointmentRows, 1000) as $chunk) {
            Appointment::insert($chunk);
        }

        $this->command?->info('ReportSeeder: seeded '.count($visitRows).' visits and '.count($appointmentRows).' appointments for '.$startOfMonth->format('Y-m'));
    }
}