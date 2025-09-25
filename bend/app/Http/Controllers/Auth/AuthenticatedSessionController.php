<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): JsonResponse
{
    $request->validate([
        'email' => ['required', 'string', 'email'],
        'password' => ['required', 'string'],
    ]);

    if (!Auth::attempt($request->only('email', 'password'), $request->boolean('remember'))) {
        throw ValidationException::withMessages([
            'email' => trans('auth.failed'),
        ]);
    }

    $user = Auth::user();

    if ($user->role === 'staff') {
        $fingerprint = $this->generateDeviceFingerprint($request);

        $device = DB::table('staff_device')
            ->where('user_id', $user->id)
            ->where('device_fingerprint', $fingerprint)
            ->first();

        if (!$device) {
            $code = strtoupper(Str::random(6));

            DB::table('staff_device')->insert([
                'user_id' => $user->id,
                'device_fingerprint' => $fingerprint,
                'temporary_code' => $code,
                'is_approved' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    $request->session()->regenerate();

    return response()->json([
        'status' => 'success',
        'message' => 'Login successful.',
        'user' => $user,
    ]);
}



    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return response()->noContent();
    }
    private function generateDeviceFingerprint(Request $request): string
    {
        return hash('sha256', $request->ip() . '|' . $request->userAgent());
    }

}
