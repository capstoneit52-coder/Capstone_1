<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\ClinicWeeklySchedule;
use Illuminate\Http\Request;

class ClinicWeeklyScheduleController extends Controller
{
    /**
     * List all weekly rows (0=Sun .. 6=Sat).
     */
    public function index()
    {
        return ClinicWeeklySchedule::orderBy('weekday')->get();
    }

    /**
     * Update a single weekday (open/close + hours + note only).
     */
    public function update(Request $request, string $id)
    {
        $schedule = ClinicWeeklySchedule::findOrFail($id);

        $data = $request->validate([
            'is_open' => ['required', 'boolean'],
            'open_time' => ['nullable', 'date_format:H:i'],
            'close_time' => ['nullable', 'date_format:H:i'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        // If closed, clear times
        if ($data['is_open'] === false) {
            $data['open_time'] = null;
            $data['close_time'] = null;
        }

        $schedule->update($data);

        return $schedule;
    }
}
