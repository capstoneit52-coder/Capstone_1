<?php

namespace App\Http\Controllers\API;

use App\Models\Service;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class ServiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Service::with('bundledServices')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:255',
            'is_excluded_from_analytics' => 'boolean',
            'is_special' => 'boolean',
            'special_start_date' => 'nullable|date',
            'special_end_date' => 'nullable|date|after_or_equal:special_start_date',
            'estimated_minutes' => 'required|integer|min:1',
            'bundled_service_ids' => 'array',
            'bundled_service_ids.*' => 'exists:services,id',
        ]);

        // Round up estimated time to nearest 30 mins
        $validated['estimated_minutes'] = ceil($validated['estimated_minutes'] / 30) * 30;

        $service = Service::create($validated);

        // Sync bundled services (if any)
        if ($request->has('bundled_service_ids')) {
            $service->bundledServices()->sync($request->input('bundled_service_ids'));
        }

        return response()->json($service->load('bundledServices'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return response()->json(Service::with('bundledServices')->findOrFail($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $service = Service::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'category' => 'nullable|string|max:255',
            'is_excluded_from_analytics' => 'boolean',
            'is_special' => 'boolean',
            'special_start_date' => 'nullable|date',
            'special_end_date' => 'nullable|date|after_or_equal:special_start_date',
            'estimated_minutes' => 'sometimes|required|integer|min:1',
            'bundled_service_ids' => 'array',
            'bundled_service_ids.*' => 'exists:services,id',
        ]);

        if (isset($validated['estimated_minutes'])) {
            $validated['estimated_minutes'] = ceil($validated['estimated_minutes'] / 30) * 30;
        }

        $service->update($validated);

        // Sync bundled services
        if ($request->has('bundled_service_ids')) {
            $service->bundledServices()->sync($request->input('bundled_service_ids'));
        }

        return response()->json($service->load('bundledServices'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $service = Service::findOrFail($id);
        $service->delete();
        return response()->json(null, 204);
    }
}
