<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\Appointment;
use App\Models\PatientVisit;
use Illuminate\Console\Command;
use App\Services\SystemLogService;

class MarkNoShows extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:mark-no-shows';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark approved appointments as no_show if more than 1 hour past start with no visit.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();

        $candidates = Appointment::where('status', 'approved')
            ->whereDate('date', '<=', $now->toDateString())
            ->get();

        $updated = 0;

        foreach ($candidates as $appointment) {
            if (!$appointment->time_slot || strpos($appointment->time_slot, '-') === false) continue;

            [$startStr] = explode('-', $appointment->time_slot, 2);
            $startStr = trim($startStr);
            if (strlen($startStr) === 8) {
                $startStr = Carbon::createFromFormat('H:i:s', $startStr)->format('H:i');
            }

            try {
                $startAt = Carbon::createFromFormat('Y-m-d H:i', $appointment->date . ' ' . $startStr);
            } catch (\Exception $e) {
                continue;
            }

            if ($now->lte($startAt->copy()->addHour())) {
                continue; // not yet 1 hour past start
            }

            // Check for a corresponding visit (same patient, same service, same date)
            $hasVisit = PatientVisit::where('patient_id', $appointment->patient_id)
                ->where('service_id', $appointment->service_id)
                ->whereDate('visit_date', $appointment->date)
                ->exists();

            if ($hasVisit) {
                continue; // attended
            }

            $old = $appointment->status;
            $appointment->status = 'no_show';
            $appointment->save();

            SystemLogService::logAppointment(
                'marked_no_show',
                $appointment->id,
                'Automatically marked appointment as no_show after missing the slot.',
                [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $appointment->patient_id,
                    'service_id' => $appointment->service_id,
                    'date' => $appointment->date,
                    'time_slot' => $appointment->time_slot,
                    'previous_status' => $old,
                ]
            );

            $updated += 1;
        }

        $this->info("Marked {$updated} appointment(s) as no_show.");
        return self::SUCCESS;
    }
}

