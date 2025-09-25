<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeviceStatusController extends Controller
{
    /**
     * Check if the current device (based on fingerprint) is approved.
     */
    public function check(Request $request)
    {
        $user = $request->user();

        $fingerprint = hash('sha256', $request->ip() . '|' . $request->userAgent());

        $device = DB::table('staff_device')
            ->where('user_id', $user->id)
            ->where('device_fingerprint', $fingerprint)
            ->first();

        return response()->json([
            'approved' => $device && $device->is_approved,
            'device_name' => $device->device_name ?? null,
            'temporary_code' => $device->temporary_code ?? null,
        ]);
    }
}
