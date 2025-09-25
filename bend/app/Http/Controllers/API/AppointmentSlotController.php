<?php

namespace App\Http\Controllers\API;

use Carbon\Carbon;
use App\Models\Service;
use App\Models\Appointment;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Services\ClinicDateResolverService;

class AppointmentSlotController extends Controller
{
    /**
     * Returns all valid starting time slots for a given date and service.
     * It considers the service duration, the clinic's open hours for that day,
     * and the current usage of each 30-minute slot based on existing appointments.
     */
    public function get(Request $request, ClinicDateResolverService $resolver)
    {
        $data = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'service_id' => 'nullable|integer|exists:services,id',
        ]);

        $date = Carbon::createFromFormat('Y-m-d', $data['date'])->startOfDay();
        $snap = $resolver->resolve($date);
        if (!$snap['is_open']) {
            // keep the shape the frontend expects
            return response()->json(['slots' => []]);
        }

        // Build 30-min grid from open/close (strings like "08:00" .. "17:00")
        $blocks = ClinicDateResolverService::buildBlocks($snap['open_time'], $snap['close_time']);
        $usage  = array_fill_keys($blocks, 0);

        // Count PENDING + APPROVED on that date (parse "HH:MM[-SS]-HH:MM[-SS]")
        $appts = Appointment::whereDate('date', $date->toDateString())
            ->whereIn('status', ['pending', 'approved'])
            ->get(['time_slot']);

        foreach ($appts as $a) {
            if (!$a->time_slot || strpos($a->time_slot, '-') === false) {
                continue;
            }
            [$aStart, $aEnd] = explode('-', $a->time_slot, 2);
            $cur = $this->parseFlexibleTime(trim($aStart));
            $end = $this->parseFlexibleTime(trim($aEnd));

            while ($cur->lt($end)) {
                $k = $cur->format('H:i');
                if (isset($usage[$k])) {
                    $usage[$k] += 1;
                }
                $cur->addMinutes(30);
            }
        }

        $cap = (int) $snap['effective_capacity'];

        // Determine how many blocks the requested service needs (default 1 if none)
        $requiredBlocks = 1;
        if (!empty($data['service_id'])) {
            $service = Service::findOrFail($data['service_id']);
            $requiredBlocks = max(1, (int) ceil(($service->estimated_minutes ?? 0) / 30));
        }

        // Return every start time whose covered blocks stay strictly below cap
        $valid = [];
        foreach ($blocks as $start) {
            $t  = Carbon::createFromFormat('H:i', $start);
            $ok = true;

            for ($i = 0; $i < $requiredBlocks; $i++) {
                $k = $t->format('H:i');
                if (!array_key_exists($k, $usage) || $usage[$k] >= $cap) {
                    $ok = false;
                    break;
                }
                $t->addMinutes(30);
            }

            if ($ok) {
                $valid[] = $start; // "HH:MM"
            }
        }

        return response()->json(['slots' => $valid]);
    }

    private function fitsCapacity(string $start, int $requiredBlocks, array $usage, int $cap): bool
    {
        $t = Carbon::createFromFormat('H:i', $start);
        for ($i = 0; $i < $requiredBlocks; $i++) {
            $k = $t->format('H:i');
            if (!array_key_exists($k, $usage) || $usage[$k] >= $cap) {
                return false;
            }
            $t->addMinutes(30);
        }
        return true;
    }

    /**
     * Accepts "HH:MM" or "HH:MM:SS" and returns a Carbon instance.
     */
    private function parseFlexibleTime(string $time): Carbon
    {
        return (strlen($time) === 8)
            ? Carbon::createFromFormat('H:i:s', $time)
            : Carbon::createFromFormat('H:i', $time);
    }
}
