<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureDeviceIsApproved
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role === 'staff') {
            $fingerprint = hash('sha256', $request->ip() . '|' . $request->userAgent());

            $device = DB::table('staff_device')
                ->where('user_id', $user->id)
                ->where('device_fingerprint', $fingerprint)
                ->first();

            if (!$device || !$device->is_approved) {
                return response()->json([
                    'status' => 'blocked',
                    'message' => 'This device is not approved by the admin.'
                ], 403);
            }
        }

        return $next($request);
    }
}
