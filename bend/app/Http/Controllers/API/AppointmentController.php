<?php

namespace App\Http\Controllers\API;

use Carbon\Carbon;
use App\Models\Patient;
use App\Models\Service;
use App\Models\SystemLog;
use App\Models\Appointment;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Helpers\NotificationService;
use App\Http\Controllers\Controller;
use App\Services\ClinicDateResolverService;
use App\Services\NotificationService as SystemNotificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AppointmentController extends Controller
{
    public function store(Request $request, ClinicDateResolverService $resolver)
{
    $validated = $request->validate([
        'service_id'      => ['required', 'exists:services,id'],
        'date'            => ['required', 'date_format:Y-m-d', 'after:today'],
        // accept HH:MM or HH:MM:SS
        'start_time'      => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
        'payment_method'  => ['required', Rule::in(['cash', 'maya', 'hmo'])],
        // NEW: optional, required when payment_method = hmo
        'patient_hmo_id'  => ['nullable', 'integer', 'exists:patient_hmos,id'],
    ]);

    $service  = Service::findOrFail($validated['service_id']);
    $blocksNeeded = (int) max(1, ceil($service->estimated_minutes / 30));
    $dateStr  = $validated['date'];
    $date     = Carbon::createFromFormat('Y-m-d', $dateStr)->startOfDay();

    $startRaw = $validated['start_time'];
    $startTime = Carbon::createFromFormat('H:i', $this->normalizeTime($startRaw));

    // booking window check (tomorrow .. +7)
    $today = now()->startOfDay();
    if ($date->lte($today) || $date->gt($today->copy()->addDays(7))) {
        return response()->json(['message' => 'Date is outside the booking window.'], 422);
    }

    // resolve day snapshot
    $snap = $resolver->resolve($date);
    if (!$snap['is_open']) {
        return response()->json(['message' => 'Clinic is closed on this date.'], 422);
    }

    $open = Carbon::parse($snap['open_time']);
    $close = Carbon::parse($snap['close_time']);
    $cap = (int) $snap['effective_capacity'];

    // ensure start is in the 30-min grid and inside hours
    $grid = ClinicDateResolverService::buildBlocks($snap['open_time'], $snap['close_time']);
    if (!in_array($startTime->format('H:i'), $grid, true)) {
        return response()->json(['message' => 'Invalid start time (not on grid or outside hours).'], 422);
    }

    $endTime = $startTime->copy()->addMinutes($service->estimated_minutes);
    if ($startTime->lt($open) || $endTime->gt($close)) {
        return response()->json(['message' => 'Selected time is outside clinic hours.'], 422);
    }

    // capacity check (pending + approved)
    $capCheck = $this->checkCapacity($service, $dateStr, $startTime->format('H:i'));
    if (!$capCheck['ok']) {
        $fullAt = $capCheck['full_at'] ?? $startTime->format('H:i');
        return response()->json(['message' => "Time slot starting at {$fullAt} is already full."], 422);
    }

    // resolve booking patient by the authenticated user
    $patient = Patient::byUser(auth()->id());
    if (!$patient) {
        return response()->json([
            'message' => 'Your account is not yet linked to a patient record. Please contact the clinic.',
        ], 422);
    }

    // HMO consistency checks
    $patientHmoId = $request->input('patient_hmo_id'); // may be null

    if ($validated['payment_method'] === 'hmo') {
        if (!$patientHmoId) {
            return response()->json(['message' => 'Please select an HMO for this appointment.'], 422);
        }
        // must belong to this patient
        $hmo = DB::table('patient_hmos')->where('id', $patientHmoId)->first();
        if (!$hmo || (int)$hmo->patient_id !== (int)$patient->id) {
            return response()->json(['message' => 'Selected HMO does not belong to this patient.'], 422);
        }
        // effective on the appointment date
        if ($hmo->effective_date && $hmo->effective_date > $dateStr) {
            return response()->json(['message' => 'Selected HMO is not yet effective on the appointment date.'], 422);
        }
        if ($hmo->expiry_date && $hmo->expiry_date < $dateStr) {
            return response()->json(['message' => 'Selected HMO is expired on the appointment date.'], 422);
        }
    } else {
        // if not HMO, ignore any stray patient_hmo_id
        $patientHmoId = null;
    }

    // create appointment
    $timeSlot = $this->normalizeTime($startTime) . '-' . $this->normalizeTime($endTime);
    $referenceCode = strtoupper(Str::random(8));

    $appointment = Appointment::create([
        'patient_id'      => $patient->id,
        'service_id'      => $service->id,
        'patient_hmo_id'  => $patientHmoId, // NEW
        'date'            => $dateStr,
        'time_slot'       => $timeSlot,
        'reference_code'  => $referenceCode,
        'status'          => 'pending',
        'payment_method'  => $validated['payment_method'],
        'payment_status'  => $validated['payment_method'] === 'maya' ? 'awaiting_payment' : 'unpaid',
    ]);

    // Notify staff about the new appointment
    SystemNotificationService::notifyNewAppointment($appointment);

    // (Optional) appointment log for audit
    // DB::table('appointment_logs')->insert([...]);

    return response()->json([
        'message'        => 'Appointment booked.',
        'reference_code' => $appointment->reference_code,
        'appointment'    => $appointment
    ], 201);
}




    // Optional: Add list(), cancel(), approve(), reject() here later

    public function approve($id)
    {
        $appointment = Appointment::findOrFail($id);

        if ($appointment->status !== 'pending') {
            return response()->json(['error' => 'Appointment already processed.'], 422);
        }

        // Enforce capacity on approval
        $start = $appointment->time_slot && strpos($appointment->time_slot, '-') !== false
            ? trim(explode('-', $appointment->time_slot, 2)[0])
            : null;

        if ($start) {
            $capCheck = $this->checkCapacity($appointment->service, $appointment->date, $start);
            if (!$capCheck['ok']) {
                SystemLog::create([
                    'user_id' => auth()->id(),
                    'category' => 'appointment',
                    'action' => 'approve_failed_capacity',
                    'message' => 'Staff ' . auth()->user()->name . ' attempted to approve appointment #' . $appointment->id . ' but slot is full',
                    'context' => [
                        'appointment_id' => $appointment->id,
                        'date' => $appointment->date,
                        'time_slot' => $appointment->time_slot,
                    ],
                ]);
                return response()->json(['message' => 'Cannot approve: slot is fully booked.'], 422);
            }
        }

        $from = $appointment->status;
        $appointment->status = 'approved';
        $appointment->save();

        // Notify patient about appointment approval
        SystemNotificationService::notifyAppointmentStatusChange($appointment, 'approved');

        SystemLog::create([
            'user_id' => auth()->id(),
            'category' => 'appointment',
            'action' => 'approved',
            'message' => 'Staff ' . auth()->user()->name . ' approved appointment #' . $appointment->id,
            'context' => ['appointment_id' => $appointment->id],
        ]);

        return response()->json(['message' => 'Appointment approved.']);
    }

    public function reject(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);

        if ($appointment->status !== 'pending') {
            return response()->json(['error' => 'Appointment already processed.'], 422);
        }

        $request->validate([
            'note' => 'required|string|max:1000',
        ]);

        $from = $appointment->status;
        $appointment->status = 'rejected';
        $appointment->notes = $request->note;
        $appointment->save();

        // Notify patient about appointment rejection
        SystemNotificationService::notifyAppointmentStatusChange($appointment, 'rejected');

        SystemLog::create([
            'user_id' => auth()->id(),
            'category' => 'appointment',
            'action' => 'rejected',
            'message' => 'Staff ' . auth()->user()->name . ' rejected appointment #' . $appointment->id,
            'context' => [
                'appointment_id' => $appointment->id,
                'note' => $request->note,
            ],
        ]);

        return response()->json(['message' => 'Appointment rejected.']);
    }

    public function index(Request $request)
    {
        $query = Appointment::with(['service', 'patient']);

        // Optional filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Optional filter by date range (future-proofing)
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function userAppointments(Request $request)
    {
        $user = $request->user();

        if (!$user->patient) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => 0,
                    'per_page' => 10,
                ]
            ]);
        }

        $appointments = Appointment::with(['service', 'payments'])
            ->where('patient_id', $user->patient->id)
            ->latest('date')
            ->paginate(10);

        // Log the appointments data for debugging
        Log::info('Patient Appointments API Response', [
            'patient_id' => $user->patient->id,
            'appointments_count' => $appointments->count(),
            'appointments' => $appointments->getCollection()->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'payment_status' => $appointment->payment_status,
                    'status' => $appointment->status,
                    'payment_method' => $appointment->payment_method,
                    'payments_count' => $appointment->payments->count(),
                    'total_paid' => $appointment->payments->sum('amount_paid')
                ];
            })->toArray()
        ]);

        return response()->json($appointments);
    }

    public function cancel($id)
    {
        $user = auth()->user();

        if (!$user->patient) {
            return response()->json(['message' => 'Not linked to patient profile.'], 403);
        }

        $appointment = Appointment::where('id', $id)
            ->where('patient_id', $user->patient->id)
            ->first();

        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        if ($appointment->status !== 'pending') {
            return response()->json(['message' => 'Only pending appointments can be canceled.'], 422);
        }

        $appointment->status = 'cancelled';
        $appointment->notes = 'Cancelled by patient.';
        $appointment->canceled_at = now();
        $appointment->save();

        SystemLog::create([
            'user_id' => $user->id,
            'category' => 'appointment',
            'action' => 'canceled_by_patient',
            'message' => 'Patient canceled their appointment #' . $appointment->id,
            'context' => [
                'appointment_id' => $appointment->id,
                'patient_id' => $user->patient->id,
            ]
        ]);

        return response()->json(['message' => 'Appointment canceled.']);
    }

    public function remindable()
    {
        $start = now()->addDays(1)->toDateString();
        $end = now()->addDays(2)->toDateString();

        $appointments = Appointment::with('patient.user', 'service')
            ->whereBetween('date', [$start, $end])
            ->where('status', 'approved')
            ->whereNull('reminded_at')
            ->get();

        return response()->json($appointments);
    }


    public function sendReminder(Request $request, $id)
    {
        $appointment = Appointment::with('patient.user', 'service')->findOrFail($id);

        $d1 = now()->addDays(1)->toDateString();
        $d2 = now()->addDays(2)->toDateString();

        if (
            $appointment->status !== 'approved' ||
            !in_array($appointment->date, [$d1, $d2], true) ||   // ⬅ allow +1 or +2
            $appointment->reminded_at !== null
        ) {
            return response()->json(['message' => 'Not eligible for reminder.'], 422);
        }

        $user = $appointment->patient->user;
        if (!$user) {
            return response()->json(['message' => 'Patient has no linked user account.'], 422);
        }

        // If you haven’t already added the helper:
        $message = $request->input('message', '');
        $edited = (bool) $request->input('edited', false);

        // send via logger (no real SMS)
        NotificationService::send(
            to: $user->contact_number,
            subject: 'Dental Appointment Reminder',
            message: $message
        );

        $appointment->reminded_at = now();
        $appointment->save();

        if ($edited) {
            SystemLog::create([
                'user_id' => auth()->id(),
                'category' => 'appointment',
                'action' => 'reminder_sent_custom',
                'message' => 'Staff ' . auth()->user()->name . ' sent a custom reminder for appointment #' . $appointment->id,
                'context' => [
                    'appointment_id' => $appointment->id,
                    'message' => $message,
                ],
            ]);
        }

        return response()->json(['message' => 'Reminder sent.']);
    }


    public function resolveReferenceCode($code)
    {
        $normalized = $this->normalizeRef($code);

        $appointment = Appointment::with('service', 'patient')
            ->whereRaw('UPPER(reference_code) = ?', [$normalized])
            ->where('status', 'approved')
            // ->whereDate('date', now()->toDateString()) // optional: enable later
            ->first();

        if (!$appointment) {
            return response()->json(['message' => 'Invalid or used reference code.'], 404);
        }

        return response()->json([
            'id' => $appointment->id,
            'patient_name' => $appointment->patient->first_name . ' ' . $appointment->patient->last_name,
            'service_name' => $appointment->service->name,
            'date' => $appointment->date,
            'time_slot' => $appointment->time_slot,
        ]);
    }


    // Normalize staff-entered code (strip spaces/dashes, uppercase)
    protected function normalizeRef(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
    }

    /**
     * Staff-only exact resolver.
     * GET /api/appointments/resolve-exact?code=XXXXYYYY
     */
    public function resolveExact(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:8'], // adjust size if your codes differ
        ]);

        $code = $this->normalizeRef($data['code']);

        $appointment = Appointment::with(['service', 'patient.user'])
            ->whereRaw('UPPER(reference_code) = ?', [$code])
            ->first();

        if (!$appointment) {
            return response()->json(['message' => 'No appointment found for that code'], 404);
        }

        // Optional: only allow certain statuses
        // if (!in_array($appointment->status, ['pending','approved'])) {
        //     return response()->json(['message' => 'Appointment not actionable'], 422);
        // }

        // Audit trail (recommended)
        SystemLog::create([
            'user_id' => auth()->id(),
            'category' => 'appointment',
            'action' => 'resolve_by_code',
            'message' => 'Staff ' . auth()->user()->name . ' looked up appointment by reference code',
            'context' => [
                'reference_code' => $code,
                'appointment_id' => $appointment->id,
            ],
        ]);

        return response()->json($appointment);
    }

    private function normalizeTime(Carbon|string $time): string
    {
        if ($time instanceof Carbon) {
            return $time->format('H:i');
        }
        // handles "HH:MM" or "HH:MM:SS"
        return Carbon::createFromFormat(strlen($time) === 8 ? 'H:i:s' : 'H:i', $time)->format('H:i');
    }

    /**
     * Check per-block capacity for a given service, date (Y-m-d) and start time (H:i or H:i:s).
     * Returns [ 'ok' => bool, 'full_at' => 'HH:MM' ]
     */
    private function checkCapacity(Service $service, string $dateStr, string $startRaw): array
    {
        $resolver = app(ClinicDateResolverService::class);
        $date = Carbon::createFromFormat('Y-m-d', $dateStr)->startOfDay();
        $snap = $resolver->resolve($date);

        $grid = ClinicDateResolverService::buildBlocks($snap['open_time'], $snap['close_time']);
        $cap = (int) $snap['effective_capacity'];

        $startTime = Carbon::createFromFormat('H:i', $this->normalizeTime($startRaw));
        $blocksNeeded = (int) max(1, ceil(($service->estimated_minutes ?? 30) / 30));

        // build usage map for the date (pending + approved)
        $slotUsage = array_fill_keys($grid, 0);
        $appointments = Appointment::whereDate('date', $dateStr)
            ->whereIn('status', ['pending', 'approved'])
            ->get(['time_slot']);

        foreach ($appointments as $appt) {
            if (!$appt->time_slot || strpos($appt->time_slot, '-') === false) continue;

            [$aStart, $aEnd] = explode('-', $appt->time_slot, 2);
            $aStart = $this->normalizeTime(trim($aStart));
            $aEnd   = $this->normalizeTime(trim($aEnd));

            $cur = Carbon::createFromFormat('H:i', $aStart);
            $end = Carbon::createFromFormat('H:i', $aEnd);

            while ($cur->lt($end)) {
                $k = $cur->format('H:i');
                if (isset($slotUsage[$k])) $slotUsage[$k] += 1;
                $cur->addMinutes(30);
            }
        }

        // per-block capacity check
        $cursor = $startTime->copy();
        for ($i = 0; $i < $blocksNeeded; $i++) {
            $k = $cursor->format('H:i');
            if (!array_key_exists($k, $slotUsage) || $slotUsage[$k] >= $cap) {
                return ['ok' => false, 'full_at' => $k];
            }
            $cursor->addMinutes(30);
        }

        return ['ok' => true];
    }

    /**
     * POST /api/appointments/{id}/hmo/reveal
     * Body: { password: string }
     * Requires role admin|staff and correct current password
     * Returns decrypted HMO info for the appointment's patient_hmo_id
     */
    public function revealHmo(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'staff'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (!\Illuminate\Support\Facades\Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid password'], 401);
        }

        $appointment = Appointment::findOrFail($id);
        if (!$appointment->patient_hmo_id) {
            return response()->json(['message' => 'No HMO selected for this appointment'], 422);
        }

        $hmo = \App\Models\PatientHmo::findOrFail($appointment->patient_hmo_id);

        return response()->json([
            'provider_name' => $hmo->provider_name,
            'member_id'     => $hmo->member_id_encrypted,
            'policy_no'     => $hmo->policy_no_encrypted,
            'effective_date'=> $hmo->effective_date,
            'expiry_date'   => $hmo->expiry_date,
        ]);
    }

    /**
     * POST /api/appointments/{id}/hmo/notify
     * Body: { message: string, coverage_amount?: number, approve?: boolean }
     */
    public function notifyHmoCoverage(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['admin', 'staff'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $request->validate([
            'message'         => ['required', 'string', 'max:1000'],
            'coverage_amount' => ['nullable', 'numeric', 'min:0'],
            'approve'         => ['sometimes', 'boolean'],
        ]);

        $appointment = Appointment::with(['patient', 'service'])->findOrFail($id);
        $patient = $appointment->patient;
        if (!$patient || !$patient->user_id) {
            return response()->json(['message' => 'Patient is not linked to a user'], 422);
        }

        $servicePrice = $appointment->service?->price ?? null;
        $coverage = isset($v['coverage_amount']) ? (float) $v['coverage_amount'] : null;
        $balance  = ($servicePrice !== null && $coverage !== null) ? max(0, (float)$servicePrice - $coverage) : null;

        $noteLines = [];
        $noteLines[] = '[HMO Review] ' . trim($v['message']);
        if ($coverage !== null) $noteLines[] = 'Coverage: ' . number_format($coverage, 2);
        if ($balance !== null) $noteLines[] = 'Estimated balance: ' . number_format($balance, 2);
        $appointment->notes = trim(implode("\n", array_filter($noteLines)));
        $appointment->save();

        \Illuminate\Support\Facades\DB::transaction(function () use ($user, $patient, $coverage, $balance, $v) {
            $noticeId = \Illuminate\Support\Facades\DB::table('notifications')->insertGetId([
                'type'            => 'hmo_coverage',
                'title'           => 'HMO Coverage Update',
                'body'            => $v['message'],
                'severity'        => 'info',
                'scope'           => 'targeted',
                'audience_roles'  => null,
                'effective_from'  => now(),
                'effective_until' => null,
                'data'            => json_encode([
                    'patient_id'      => $patient->id,
                    'coverage_amount' => $coverage,
                    'balance_due'     => $balance,
                    'by_user_id'      => $user->id,
                ]),
                'created_by'      => $user->id,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            \Illuminate\Support\Facades\DB::table('notification_targets')->upsert([
                [
                    'notification_id' => $noticeId,
                    'user_id'         => $patient->user_id,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]
            ], ['notification_id','user_id'], []);
        });

        if (!empty($v['approve']) && $appointment->status === 'pending') {
            $appointment->status = 'approved';
            $appointment->save();
        }

        return response()->json([
            'message' => 'Coverage noted and patient notified',
            'balance_due' => $balance,
        ]);
    }
}
