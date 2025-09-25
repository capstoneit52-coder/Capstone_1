<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use App\Services\SystemLogService;


class DeviceApprovalController extends Controller
{
    public function index()
    {
        $pendingDevices = DB::table('staff_device')
            ->join('users', 'users.id', '=', 'staff_device.user_id')
            ->select(
                'staff_device.id',
                'staff_device.user_id',
                'users.name as staff_name',
                'staff_device.device_fingerprint',
                'staff_device.temporary_code',
                'staff_device.created_at'
            )
            ->where('staff_device.is_approved', false)
            ->orderByDesc('staff_device.created_at')
            ->get();

        return response()->json($pendingDevices);
    }

    // ✅ Approve a specific device
    public function approve(Request $request)
    {
        $request->validate([
            'device_id' => 'required|exists:staff_device,id',
            'device_name' => 'nullable|string|max:255',
        ]);

        DB::table('staff_device')
            ->where('id', $request->device_id)
            ->where('is_approved', false)
            ->update([
                'is_approved' => true,
                'temporary_code' => null,
                'device_name' => $request->device_name,
                'updated_at' => now(),
            ]);

        // Log the device approval
        SystemLogService::logDevice(
            'approved',
            $request->device_id,
            "Device approved with name: {$request->device_name}",
            ['device_name' => $request->device_name]
        );

        return response()->json(['message' => 'Device approved successfully.']);
    }

    // ❌ Reject/delete a specific device
    public function reject(Request $request)
    {
        $request->validate([
            'device_id' => 'required|exists:staff_device,id',
        ]);

        DB::table('staff_device')->where('id', $request->device_id)->delete();

        // Log the device rejection
        SystemLogService::logDevice(
            'rejected',
            $request->device_id,
            "Device rejected and removed from system"
        );

        return response()->json(['message' => 'Device rejected and removed.']);
    }

    public function approvedDevices()
    {
        $devices = DB::table('staff_device')
            ->join('users', 'users.id', '=', 'staff_device.user_id')
            ->select(
                'staff_device.id',
                'staff_device.user_id',
                'users.name as staff_name',
                'staff_device.device_name',
                'staff_device.device_fingerprint',
                'staff_device.created_at',
                'staff_device.updated_at'
            )
            ->where('staff_device.is_approved', true)
            ->orderByDesc('staff_device.updated_at')
            ->get();

        return response()->json($devices);
    }


    public function renameDevice(Request $request)
    {
        $request->validate([
            'device_id' => 'required|exists:staff_device,id',
            'device_name' => 'required|string|max:255',
        ]);

        DB::table('staff_device')
            ->where('id', $request->device_id)
            ->update([
                'device_name' => $request->device_name,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Device name updated successfully.']);
    }

    public function revokeDevice(Request $request)
    {
        $request->validate([
            'device_id' => 'required|exists:staff_device,id',
        ]);

        DB::table('staff_device')
            ->where('id', $request->device_id)
            ->update([
                'is_approved' => false,
                'temporary_code' => strtoupper(Str::random(6)), // Optional
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Device access revoked.']);
    }

}
