<?php

namespace App\Services;

use App\Models\ClinicCalendar;
use App\Models\ClinicWeeklySchedule;
use App\Models\DentistSchedule;
use Carbon\Carbon;

class ClinicDateResolverService
{
    /**
     * Returns a day snapshot used by availability & booking.
     * [
     *   'is_open' => bool,
     *   'open_time' => 'HH:MM'|null,
     *   'close_time' => 'HH:MM'|null,
     *   'dentist_count' => int,
     *   'calendar_max_per_block' => int|null,
     *   'effective_capacity' => int
     * ]
     */
    public function resolve($date): array
    {
        $d = $date instanceof Carbon ? $date->copy()->startOfDay() : Carbon::parse($date)->startOfDay();

        // ── 1) Weekly template (hours only — no capacity here)
        // Support BOTH schemas:
        //   A) row-per-weekday: columns [weekday, is_open, open_time, close_time]
        //   B) single wide row: columns like sun_is_open, sun_open_time, sun_close_time ...
        $isOpen = false;
        $open = null;
        $close = null;

        // A) Try row-per-weekday first
        $weeklyRow = ClinicWeeklySchedule::query()
            ->where('weekday', $d->dayOfWeek) // 0=Sun .. 6=Sat
            ->first();

        if ($weeklyRow) {
            $isOpen = (bool) ($weeklyRow->is_open ?? false);
            $open   = $this->toHi($weeklyRow->open_time ?? '08:00');
            $close  = $this->toHi($weeklyRow->close_time ?? '17:00');
        } else {
            // B) Fallback to single wide row
            $weeklyWide = ClinicWeeklySchedule::query()->first(); // the only row
            if ($weeklyWide) {
                $weekday   = strtolower($d->format('D')); // sun..sat
                $isOpenCol = $weekday . '_is_open';
                $openCol   = $weekday . '_open_time';
                $closeCol  = $weekday . '_close_time';

                $isOpen = (bool) ($weeklyWide->{$isOpenCol} ?? $weeklyWide->is_open ?? false);
                $open   = $this->toHi($weeklyWide->{$openCol}  ?? $weeklyWide->open_time  ?? '08:00');
                $close  = $this->toHi($weeklyWide->{$closeCol} ?? $weeklyWide->close_time ?? '17:00');
            }
        }

        if (!$open || !$close) {
            // If weekly schedule isn’t configured yet, treat as closed.
            return [
                'is_open' => false,
                'open_time' => null,
                'close_time' => null,
                'dentist_count' => 0,
                'calendar_max_per_block' => null,
                'effective_capacity' => 0,
            ];
        }

        // ── 2) Per-date calendar override (open/close + optional cap)
        $cal = ClinicCalendar::query()->whereDate('date', $d)->first();
        if ($cal) {
            if (!is_null($cal->is_open)) {
                $isOpen = (bool) $cal->is_open;
            }
            if (!empty($cal->open_time)) {
                $open = $this->toHi($cal->open_time);
            }
            if (!empty($cal->close_time)) {
                $close = $this->toHi($cal->close_time);
            }
        }

        // ── 3) Dentist capacity for this date
        $dentistCount = DentistSchedule::countForDate($d);

        // ── 4) Per-date cap override (reserve room for walk-ins)
        $overrideCap = $cal->max_per_block_override ?? null;
        $effective   = is_null($overrideCap) ? $dentistCount : min($dentistCount, (int) $overrideCap);

        return [
            'is_open' => (bool) $isOpen,
            'open_time' => $open,   // always 'HH:MM'
            'close_time' => $close, // always 'HH:MM'
            'dentist_count' => (int) $dentistCount,
            'calendar_max_per_block' => is_null($overrideCap) ? null : (int) $overrideCap,
            'effective_capacity' => max(0, (int) $effective),
        ];
    }

    /** Normalize any DB/Carbon value to 'HH:MM' (tolerates 'HH:MM', 'HH:MM:SS', Carbon, null). */
    private function toHi($val): ?string
    {
        if ($val === null || $val === '') return null;
        try {
            return Carbon::parse($val)->format('H:i');
        } catch (\Throwable $e) {
            // as a last resort, truncate 'HH:MM:SS' -> 'HH:MM'
            if (is_string($val) && strlen($val) >= 5) {
                return substr($val, 0, 5);
            }
            return null;
        }
    }

    /** Build 30‑min grid (exclusive of close). */
    public static function buildBlocks(string $open, string $close): array
    {
        [$oh, $om] = array_map('intval', explode(':', $open));
        [$ch, $cm] = array_map('intval', explode(':', $close));
        $cur = Carbon::createFromTime($oh, $om);
        $end = Carbon::createFromTime($ch, $cm);
        $out = [];
        while ($cur->lt($end)) {
            $out[] = $cur->format('H:i');
            $cur->addMinutes(30);
        }
        return $out;
    }

    public static function isOpen($date): bool
    {
        $service = app(self::class);
        return $service->resolve($date)['is_open'] === true;
    }

    public static function getOpenDatesBetween($start, $end): array
    {
        $service = app(self::class);
        $openDates = [];
        $startDate = Carbon::parse($start)->startOfDay();
        $endDate   = Carbon::parse($end)->startOfDay();
        while ($startDate->lte($endDate)) {
            if ($service->isOpen($startDate)) {
                $openDates[] = $startDate->toDateString();
            }
            $startDate->addDay();
        }
        return $openDates;
    }
}
