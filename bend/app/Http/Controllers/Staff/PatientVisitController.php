<?php

namespace App\Http\Controllers\Staff;

use App\Models\Patient;
use App\Models\Payment;
use App\Models\SystemLog;
use App\Models\Appointment;
use Illuminate\Support\Str;
use App\Models\PatientVisit;
use Illuminate\Http\Request;
use App\Models\InventoryItem;
use Illuminate\Support\Carbon;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;


class PatientVisitController extends Controller
{
    // 🟢 List visits (e.g. for tracker)
    public function index()
    {
        $visits = PatientVisit::with(['patient', 'service'])
            ->latest('start_time')
            ->take(50)
            ->get();

        return response()->json($visits);
    }

    // 🟢 Create a new patient visit (start timer)
    public function store(Request $request)
    {
        $visitType = $request->input('visit_type');

        if ($visitType === 'walkin') {
            // ✅ Create placeholder patient
            $patient = Patient::create([
                'first_name' => 'Patient',
                'last_name' => strtoupper(Str::random(6)),
                'user_id' => null,
            ]);

            // ✅ Create the visit
            $visit = PatientVisit::create([
                'patient_id' => $patient->id,
                'service_id' => null, // to be selected later
                'visit_date' => now()->toDateString(),
                'start_time' => now(),
                'status' => 'pending',
            ]);

            return response()->json($visit, 201);
        } elseif ($visitType === 'appointment') {
            $data = $request->validate([
                'reference_code' => ['required', 'string', 'size:8'],
            ]);

            $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $data['reference_code']));

            $appointment = Appointment::with(['patient', 'service'])
                ->whereRaw('UPPER(reference_code) = ?', [$code])
                ->where('status', 'approved')
                // ->whereDate('date', now()->toDateString()) // re-enable if you want “today only”
                ->first();

            if (!$appointment) {
                return response()->json(['message' => 'Invalid or unavailable reference code.'], 422);
            }

            // Create the visit
            $visit = PatientVisit::create([
                'patient_id' => $appointment->patient_id,
                'service_id' => $appointment->service_id,
                'visit_date' => now()->toDateString(),
                'start_time' => now(),
                'status' => 'pending',
            ]);

            // Prevent code reuse (recommended)
            $appointment->reference_code = null;
            $appointment->save();

            return response()->json($visit, 201);
        }

        return response()->json(['message' => 'Invalid visit type.'], 422);
    }

    // 🟡 Update visit details (e.g. service selection)
    public function updatePatient(Request $request, $id)
    {
        $visit = PatientVisit::findOrFail($id);
        $patient = $visit->patient;

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'contact_number' => 'nullable|string|max:20',
            'service_id' => 'nullable|exists:services,id',
        ]);

        $patient->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'contact_number' => $validated['contact_number'],
        ]);

        $visit->update([
            'service_id' => $validated['service_id'],
        ]);

        // Optional audit log (can be saved into a `visit_logs` table or something)
        // \Log::info("Patient visit #{$visit->id} updated by staff", [
        //     'edited_fields' => $validated,
        //     'edited_by' => auth()->user()->id
        // ]);

        return response()->json(['message' => 'Patient updated']);
    }



    // 🟡 Mark a visit as finished (end timer)
    public function finish($id)
    {
        $visit = PatientVisit::findOrFail($id);

        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Only pending visits can be processed.'], 422);
        }

        $visit->update([
            'end_time' => now(),
            'status' => 'completed',
        ]);

        return response()->json(['message' => 'Visit completed.']);
    }

    /**
     * POST /api/visits/{id}/complete-with-details
     * Complete visit with stock consumption, encrypted notes, and payment verification
     */
    public function completeWithDetails(Request $request, $id)
    {
        $visit = PatientVisit::with(['patient', 'service', 'payments'])->findOrFail($id);

        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Only pending visits can be completed.'], 422);
        }

        $validated = $request->validate([
            'stock_items' => ['required', 'array'],
            'stock_items.*.item_id' => ['required', 'exists:inventory_items,id'],
            'stock_items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'stock_items.*.notes' => ['nullable', 'string'],
            'dentist_notes' => ['nullable', 'string', 'max:2000'],
            'findings' => ['nullable', 'string', 'max:2000'],
            'treatment_plan' => ['nullable', 'string', 'max:2000'],
            'payment_status' => ['required', 'in:paid,hmo_fully_covered,partial,unpaid'],
            'onsite_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method_change' => ['nullable', 'in:maya_to_cash'],
        ]);

        $userId = $request->user()->id;
        return DB::transaction(function () use ($visit, $validated, $userId) {
            // 1. Consume stock items and update batch quantities
            foreach ($validated['stock_items'] as $item) {
                $inventoryItem = InventoryItem::with([
                    'batches' => function ($q) {
                        $q->where('qty_on_hand', '>', 0)
                            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
                            ->orderBy('expiry_date', 'asc')
                            ->orderBy('received_at', 'asc')
                            ->lockForUpdate();
                    }
                ])->findOrFail($item['item_id']);

                $totalOnHand = (float) $inventoryItem->batches->sum('qty_on_hand');
                if ((float) $item['quantity'] > $totalOnHand) {
                    throw new \Exception("Insufficient stock for {$inventoryItem->name}. Requested {$item['quantity']} but only {$totalOnHand} available.");
                }

                $remaining = (float) $item['quantity'];
                foreach ($inventoryItem->batches as $batch) {
                    if ($remaining <= 0)
                        break;

                    $take = min($remaining, (float) $batch->qty_on_hand);
                    $batch->qty_on_hand = (float) $batch->qty_on_hand - $take;
                    $batch->save();

                    InventoryMovement::create([
                        'item_id' => $item['item_id'],
                        'batch_id' => $batch->id,
                        'type' => 'consume',
                        'quantity' => $take,
                        'ref_type' => 'visit',
                        'ref_id' => $visit->id,
                        'user_id' => $userId,
                        'notes' => $item['notes'] ?? null,
                    ]);

                    $remaining -= $take;
                }

                // Check for low stock threshold after consumption
                $inventoryItem->refresh();
                if ($inventoryItem->low_stock_threshold > 0) {
                    $total = (float) $inventoryItem->batches()->sum('qty_on_hand');
                    if ($total <= (float) $inventoryItem->low_stock_threshold) {
                        \App\Services\NotificationService::notifyLowStock($inventoryItem, $total);
                    }
                }
            }

            // 2. Update visit with encrypted notes
            $visit->update([
                'end_time' => now(),
                'status' => 'completed',
                'note' => json_encode([
                    'dentist_notes' => $validated['dentist_notes'] ?? null,
                    'findings' => $validated['findings'] ?? null,
                    'treatment_plan' => $validated['treatment_plan'] ?? null,
                    'completed_by' => $userId,
                    'completed_at' => now(),
                ]),
            ]);

            // 3. Handle payment verification/adjustment
            $totalPaid = $visit->payments->sum('amount_paid');
            $servicePrice = $visit->service?->price ?? 0;

            if ($validated['payment_status'] === 'paid') {
                // If already fully paid, no action needed
                // If not fully paid, create a cash payment to cover the balance
                if ($totalPaid < $servicePrice) {
                    $balance = $servicePrice - $totalPaid;
                    Payment::create([
                        'patient_visit_id' => $visit->id,
                        'amount_due' => $balance,
                        'amount_paid' => $balance,
                        'method' => 'cash',
                        'status' => 'paid',
                        'reference_no' => 'CASH-' . $visit->id . '-' . time(),
                        'created_by' => $userId,
                        'paid_at' => now(),
                    ]);
                }
            } elseif ($validated['payment_status'] === 'hmo_fully_covered') {
                // HMO fully covered - create HMO payment record
                Payment::create([
                    'patient_visit_id' => $visit->id,
                    'amount_due' => $servicePrice,
                    'amount_paid' => $servicePrice,
                    'method' => 'hmo',
                    'status' => 'paid',
                    'reference_no' => 'HMO-' . $visit->id . '-' . time(),
                    'created_by' => $userId,
                    'paid_at' => now(),
                ]);
            } elseif ($validated['payment_status'] === 'partial' && isset($validated['onsite_payment_amount'])) {
                // Add on-site payment
                Payment::create([
                    'patient_visit_id' => $visit->id,
                    'amount_due' => $validated['onsite_payment_amount'],
                    'amount_paid' => $validated['onsite_payment_amount'],
                    'method' => 'cash',
                    'status' => 'paid',
                    'reference_no' => 'CASH-' . $visit->id . '-' . time(),
                    'created_by' => $userId,
                    'paid_at' => now(),
                ]);
            } elseif ($validated['payment_status'] === 'unpaid' && isset($validated['payment_method_change'])) {
                // Change Maya to cash payment
                $mayaPayment = $visit->payments->where('method', 'maya')->first();
                if ($mayaPayment) {
                    $mayaPayment->update([
                        'method' => 'cash',
                        'status' => 'paid',
                        'amount_paid' => $mayaPayment->amount_due,
                        'paid_at' => now(),
                    ]);
                }
            }

            // 4) Update appointment.payment_status based on the processed visit payment_status
            // Map visit payment status -> appointment's simple enum
            $appointmentPaymentStatus = match ($validated['payment_status']) {
                'paid', 'hmo_fully_covered', 'partial' => 'paid', // any payment -> paid
                'unpaid' => 'unpaid',
                default => 'unpaid',
            };

            // Find and update matching appointments
            $matchingAppointments = Appointment::where('patient_id', $visit->patient_id)
                ->where('service_id', $visit->service_id)
                ->whereDate('date', $visit->visit_date)
                ->whereIn('status', ['approved', 'completed'])
                ->get();

            Log::info('Updating appointment payment status', [
                'visit_id' => $visit->id,
                'patient_id' => $visit->patient_id,
                'service_id' => $visit->service_id,
                'visit_date' => $visit->visit_date,
                'payment_status' => $validated['payment_status'],
                'appointment_payment_status' => $appointmentPaymentStatus,
                'matching_appointments_count' => $matchingAppointments->count()
            ]);

            foreach ($matchingAppointments as $appointment) {
                $oldStatus = $appointment->payment_status;
                $appointment->update(['payment_status' => $appointmentPaymentStatus]);
                
                Log::info('Appointment payment status updated', [
                    'appointment_id' => $appointment->id,
                    'old_status' => $oldStatus,
                    'new_status' => $appointmentPaymentStatus
                ]);
            }


            return response()->json([
                'message' => 'Visit completed successfully',
                'visit' => $visit->fresh(['patient', 'service', 'payments']),
            ]);
        });
    }

    // 🔴 Reject visit
    public function reject($id, Request $request)
    {
        $visit = PatientVisit::findOrFail($id);

        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Only pending visits can be processed.'], 422);
        }

        $visit->update([
            'end_time' => now(),
            'status' => 'rejected',
            'note' => $this->buildRejectionNote($request),

        ]);

        return response()->json(['message' => 'Visit rejected.']);
    }

    private function buildRejectionNote(Request $request)
    {
        $reason = $request->input('reason'); // 'human_error', 'left', 'line_too_long'
        $offered = $request->input('offered_appointment'); // true or false

        if ($reason === 'line_too_long') {
            return "Rejected: Line too long. Offered appointment: " . ($offered ? 'Yes' : 'No');
        }

        return match ($reason) {
            'human_error' => 'Rejected: Human error',
            'left' => 'Rejected: Patient left',
            default => 'Rejected: Unknown reason'
        };
    }

    public function linkToExistingPatient(Request $request, $visitId)
    {
        $request->validate([
            'target_patient_id' => 'required|exists:patients,id',
        ]);

        $visit = PatientVisit::findOrFail($visitId);
        $oldPatient = Patient::findOrFail($visit->patient_id);
        $targetPatient = Patient::findOrFail($request->target_patient_id);

        // Replace the link to the correct patient profile
        $visit->update([
            'patient_id' => $targetPatient->id,
        ]);

        // Log example: "Linked visit from Patient #12 → #4 by Staff #2"
        // In future, insert this into system_logs with performed_by, note, etc.

        // Delete the temporary patient profile
        $oldPatient->delete(); // full delete for now

        return response()->json([
            'message' => 'Visit successfully linked to existing patient profile.',
            'visit' => $visit->load('patient'),
        ]);
    }

    /**
     * POST /api/visits/{id}/view-notes
     * View encrypted visit notes with current user's password verification
     */
    public function viewNotes(Request $request, $id)
    {
        $visit = PatientVisit::findOrFail($id);
        $user = $request->user();

        if ($visit->status !== 'completed' || !$visit->note) {
            return response()->json(['message' => 'No encrypted notes available for this visit.'], 404);
        }

        $validated = $request->validate([
            'password' => 'required|string',
        ]);

        // Verify the current user's password
        if (!Hash::check($validated['password'], $user->password)) {
            // Log failed access attempt
            SystemLog::create([
                'user_id' => $user->id,
                'category' => 'visit_notes',
                'action' => 'access_denied',
                'subject_id' => $visit->id,
                'message' => 'Failed to access visit notes - invalid password',
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'attempted_at' => now()->toISOString(),
                ],
            ]);

            return response()->json(['message' => 'Invalid password.'], 401);
        }

        try {
            // Decrypt the notes (they're stored as JSON)
            $notes = json_decode($visit->note, true);

            if (!$notes) {
                return response()->json(['message' => 'Failed to decrypt notes.'], 500);
            }

            // Log successful access
            SystemLog::create([
                'user_id' => $user->id,
                'category' => 'visit_notes',
                'action' => 'viewed',
                'subject_id' => $visit->id,
                'message' => 'Successfully accessed visit notes',
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'accessed_at' => now()->toISOString(),
                    'notes_contained' => [
                        'dentist_notes' => !empty($notes['dentist_notes']),
                        'findings' => !empty($notes['findings']),
                        'treatment_plan' => !empty($notes['treatment_plan']),
                    ],
                ],
            ]);

            return response()->json([
                'message' => 'Notes decrypted successfully.',
                'notes' => $notes,
            ]);
        } catch (\Exception $e) {
            // Log decryption failure
            SystemLog::create([
                'user_id' => $user->id,
                'category' => 'visit_notes',
                'action' => 'decryption_failed',
                'subject_id' => $visit->id,
                'message' => 'Failed to decrypt visit notes',
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'error' => $e->getMessage(),
                    'attempted_at' => now()->toISOString(),
                ],
            ]);

            return response()->json(['message' => 'Failed to decrypt notes.'], 500);
        }
    }

}
