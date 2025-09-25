<?php

namespace App\Http\Controllers\API;

use App\Models\PatientHmo;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class PatientHmoController extends Controller
{
    /**
     * GET /api/patients/{patient}/hmos
     */
    /** Patient helper */
    protected function isOwnerPatient(Request $request, int $patientId): bool
    {
        // only a logged-in patient linked to this patientId owns it
        $u = $request->user();
        if ($u?->role !== 'patient')
            return false;
        return (int) ($u->patient?->id) === (int) $patientId;
    }

    /** GET /api/patients/{patient}/hmos
     *  View is allowed to: patient (self), staff, admin
     */
    public function index(Request $request, int $patient)
    {
        $items = PatientHmo::where('patient_id', $patient)
            ->orderByDesc('is_primary')
            ->orderBy('provider_name')
            ->get();

        return response()->json($items);
    }

    /** POST /api/patients/{patient}/hmos
     *  Create is allowed to: patient owner ONLY
     */
    public function store(Request $request, int $patient)
    {
        if (!$this->isOwnerPatient($request, $patient)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'provider_name' => ['required', 'string', 'max:255'],
            'member_id' => ['nullable', 'string', 'max:255'],
            'policy_no' => ['nullable', 'string', 'max:255'],
            'effective_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:effective_date'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        if (!empty($validated['is_primary'])) {
            PatientHmo::where('patient_id', $patient)->update(['is_primary' => false]);
        }

        $hmo = PatientHmo::create([
            'patient_id' => $patient,
            'provider_name' => $validated['provider_name'],
            'member_id_encrypted' => $validated['member_id'] ?? null,
            'policy_no_encrypted' => $validated['policy_no'] ?? null,
            'effective_date' => $validated['effective_date'] ?? null,
            'expiry_date' => $validated['expiry_date'] ?? null,
            'is_primary' => (bool) ($validated['is_primary'] ?? false),
            'author_id' => $request->user()?->id,
        ]);

        return response()->json($hmo, 201);
    }

    /** PUT /api/patients/{patient}/hmos/{hmo} — patient owner ONLY */
    public function update(Request $request, int $patient, int $hmo)
    {
        if (!$this->isOwnerPatient($request, $patient)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $record = PatientHmo::where('patient_id', $patient)->findOrFail($hmo);

        $validated = $request->validate([
            'provider_name' => ['sometimes', 'string', 'max:255'],
            'member_id' => ['nullable', 'string', 'max:255'],
            'policy_no' => ['nullable', 'string', 'max:255'],
            'effective_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:effective_date'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('is_primary', $validated) && $validated['is_primary']) {
            PatientHmo::where('patient_id', $patient)->where('id', '!=', $record->id)->update(['is_primary' => false]);
        }

        $record->fill([
            'provider_name' => $validated['provider_name'] ?? $record->provider_name,
            'member_id_encrypted' => array_key_exists('member_id', $validated) ? $validated['member_id'] : $record->member_id_encrypted,
            'policy_no_encrypted' => array_key_exists('policy_no', $validated) ? $validated['policy_no'] : $record->policy_no_encrypted,
            'effective_date' => array_key_exists('effective_date', $validated) ? $validated['effective_date'] : $record->effective_date,
            'expiry_date' => array_key_exists('expiry_date', $validated) ? $validated['expiry_date'] : $record->expiry_date,
            'is_primary' => array_key_exists('is_primary', $validated) ? (bool) $validated['is_primary'] : $record->is_primary,
        ]);

        $record->author_id = $request->user()?->id;
        $record->save();

        return response()->json($record);
    }

    /** DELETE /api/patients/{patient}/hmos/{hmo} — patient owner ONLY */
    public function destroy(Request $request, int $patient, int $hmo)
    {
        if (!$this->isOwnerPatient($request, $patient)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $record = PatientHmo::where('patient_id', $patient)->findOrFail($hmo);
        $record->author_id = $request->user()?->id;
        $record->save();
        $record->delete();

        return response()->json(['message' => 'Deleted'], 200);
    }
}
