<?php

namespace App\Http\Controllers\API;

use App\Models\User;
use App\Models\Patient;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class PatientController extends Controller
{
    // 🔹 For staff: list all patients
    public function index()
    {
        return Patient::with('user')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // 🔹 Staff adds a new walk-in patient
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'birthdate' => 'nullable|date',
            'sex' => 'nullable|in:male,female',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
        ]);

        $patient = Patient::create($validated);

        return response()->json([
            'message' => 'Patient added successfully.',
            'patient' => $patient
        ], 201);
    }

    // 🔹 Link patient to a registered account
    public function linkToUser(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::find($validated['user_id']);
        if ($user->role !== 'patient') {
            return response()->json(['message' => 'User is not a patient account.'], 422);
        }

        if ($patient->is_linked) {
            return response()->json(['message' => 'Patient is already linked.'], 409);
        }

        $patient->update([
            'user_id' => $validated['user_id'],
            'is_linked' => true,
            'flag_manual_review' => false,
        ]);

        return response()->json(['message' => 'Patient successfully linked.']);
    }

    // 🔹 Optional: flag patient for manual review
    public function flagReview($id)
    {
        $patient = Patient::findOrFail($id);
        $patient->update(['flag_manual_review' => true]);

        return response()->json(['message' => 'Patient flagged for review.']);
    }

    // 🔍 Search patients by name/contact (for linking modal)
    public function search(Request $request)
    {
        $query = $request->input('q');

        $results = Patient::where(function ($qbuilder) use ($query) {
            $qbuilder->where('first_name', 'like', "%{$query}%")
                ->orWhere('last_name', 'like', "%{$query}%")
                ->orWhere('contact_number', 'like', "%{$query}%");
        })
            ->orderBy('last_name')
            ->take(10)
            ->get();

        return response()->json($results);
    }

    // 🔗 Link self to a patient record (for registered users)
    public function linkSelf(Request $request)
    {
        $user = auth()->user();

        // Validate input
        $request->validate([
            'contact_number' => 'required|string|max:20|unique:users,contact_number,' . $user->id,
        ]);

        // Prevent duplicate linking
        if (Patient::byUser($user->id)) {
            return response()->json(['message' => 'Already linked.'], 400);
        }

        // 🟢 Update user table as well
        $user->contact_number = $request->contact_number;
        $user->save();

        // Create new patient record
        $patient = Patient::create([
            'first_name' => $user->name,
            'last_name' => '—',
            'email' => $user->email,
            'contact_number' => $request->contact_number,
            'user_id' => $user->id,
            'is_linked' => 1,
        ]);

        return response()->json(['message' => 'Linked successfully.']);
    }


}
