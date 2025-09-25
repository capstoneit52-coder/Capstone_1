<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Patient;
// REMOVE this if unused now:
// use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;   // ← NEW

class HmoCoverageController extends Controller
{
    public function notify(Request $request, int $patient)
    {
        $u = $request->user();
        if (!in_array($u->role, ['admin', 'staff'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $request->validate([
            'message'          => ['required','string','max:1000'],
            'coverage_amount'  => ['nullable','numeric','min:0'],
            'balance_due'      => ['nullable','numeric','min:0'],
            'status'           => ['nullable','in:approved,denied,pending'], // optional tag to badge severity
        ]);

        $patientModel = Patient::findOrFail($patient);
        $recipientUserId = $patientModel->user_id;
        if (!$recipientUserId) {
            return response()->json(['message' => 'Patient not linked to a user'], 422);
        }

        // Match your "closure" pattern: write directly to notifications + notification_targets
        return DB::transaction(function () use ($u, $v, $patient, $recipientUserId) {
            $noticeId = DB::table('notifications')->insertGetId([
                'type'            => 'hmo_coverage',
                'title'           => 'HMO Coverage Update',
                'body'            => $v['message'],
                'severity'        => ($v['status'] ?? null) === 'denied' ? 'danger' : 'info',
                'scope'           => 'targeted',           // targeted per patient
                'audience_roles'  => null,                 // targeted → NULL
                'effective_from'  => now(),
                'effective_until' => null,
                'data'            => json_encode([
                    'patient_id'      => $patient,
                    'status'          => $v['status'] ?? null,
                    'coverage_amount' => $v['coverage_amount'] ?? null,
                    'balance_due'     => $v['balance_due'] ?? null,
                    'by_user_id'      => $u->id,
                ]),
                'created_by'      => $u->id,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            // unique(notification_id,user_id) is enforced – use upsert for safety
            DB::table('notification_targets')->upsert([[
                'notification_id' => $noticeId,
                'user_id'         => $recipientUserId,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]], ['notification_id','user_id'], []);

            return response()->json(['message' => 'Notification sent', 'notification_id' => $noticeId]);
        });
    }
}
