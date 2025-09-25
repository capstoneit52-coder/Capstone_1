<?php

namespace App\Http\Controllers\API;

use Carbon\Carbon;
use App\Models\Service;
use Illuminate\Http\Request;
use App\Models\ServiceDiscount;
use App\Http\Controllers\Controller;
use App\Services\ClinicDateResolverService;

class ServiceDiscountController extends Controller
{
    public function index(Service $service)
    {
        // Mark expired launched promos as 'done'
        $cleanupCount = ServiceDiscount::where('status', 'launched')
            ->whereDate('end_date', '<', Carbon::today())
            ->update(['status' => 'done']);

        // Return active promos and cleanup count
        return response()->json([
            'cleanup_count' => $cleanupCount,
            'promos' => $service->discounts()
                ->whereIn('status', ['planned', 'launched'])
                ->orderBy('start_date')
                ->get(),
        ]);
    }

    public function store(Request $request, Service $service)
    {
        $validated = $request->validate([
            'start_date' => 'required|date|after:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'discounted_price' => 'required|numeric|min:0|max:' . $service->price,
        ]);

        // Check for overlapping promos
        $overlap = $service->discounts()
            ->where(function ($q) use ($validated) {
                $q->whereBetween('start_date', [$validated['start_date'], $validated['end_date']])
                    ->orWhereBetween('end_date', [$validated['start_date'], $validated['end_date']])
                    ->orWhere(function ($q2) use ($validated) {
                        $q2->where('start_date', '<=', $validated['start_date'])
                            ->where('end_date', '>=', $validated['end_date']);
                    });
            })
            ->where('status', '!=', 'canceled')
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'A discount already exists for this date range.',
            ], 422);
        }

        // Check clinic open days in range
        $openDates = ClinicDateResolverService::getOpenDaysInRange(
            $validated['start_date'],
            $validated['end_date']
        );

        if (count($openDates) === 0) {
            return response()->json([
                'message' => 'Cannot create promo — all selected dates are clinic closed.',
            ], 422);
        }

        $discount = $service->discounts()->create($validated);

        $response = response()->json($discount, 201);

        // Optional warning: partial closure
        $totalDays = Carbon::parse($validated['start_date'])
            ->diffInDays(Carbon::parse($validated['end_date'])) + 1;

        $closedDays = $totalDays - count($openDates);

        if ($closedDays > 0) {
            $response->setContent(json_encode([
                'promo' => $discount,
                'warning' => "$closedDays day(s) in the selected range are clinic closed and will have no effect.",
            ]));
        }

        return $response;
    }


    public function update(Request $request, $id)
    {
        $discount = ServiceDiscount::findOrFail($id);
        if ($discount->status !== 'planned') {
            return response()->json(['message' => 'Only planned promos can be edited.'], 403);
        }

        $validated = $request->validate([
            'start_date' => 'required|date|after:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'discounted_price' => 'required|numeric|min:0|max:' . $discount->service->price,
        ]);

        $discount->update($validated);
        return response()->json($discount);
    }

    // public function destroy($id)
    // {
    //     $discount = ServiceDiscount::findOrFail($id);

    //     if ($discount->status !== 'planned') {
    //         return response()->json(['message' => 'Only planned promos can be deleted.'], 403);
    //     }

    //     $discount->delete();
    //     return response()->json(['message' => 'Promo deleted.']);
    // }

    public function archive(Request $request)
    {
        $query = ServiceDiscount::with('service')
            ->where(function ($q) {
                $q->where('status', 'done')
                    ->orWhere('status', 'canceled');
            });

        if ($request->has('year')) {
            $query->whereYear('start_date', $request->year);
        }

        return response()->json(
            $query->orderBy('start_date')->get()
        );
    }


    // 🟢 Launch promo
    // 🟢 Launch promo
    public function launch($id)
    {
        $discount = ServiceDiscount::findOrFail($id);

        if ($discount->status !== 'planned') {
            return response()->json(['message' => 'Promo must be in planned state to launch.'], 422);
        }

        // Check for overlapping launched promos of the same service
        $overlap = $discount->service->discounts()
            ->where('id', '!=', $discount->id)
            ->where('status', 'launched')
            ->where(function ($q) use ($discount) {
                $q->whereBetween('start_date', [$discount->start_date, $discount->end_date])
                    ->orWhereBetween('end_date', [$discount->start_date, $discount->end_date])
                    ->orWhere(function ($q2) use ($discount) {
                        $q2->where('start_date', '<=', $discount->start_date)
                            ->where('end_date', '>=', $discount->end_date);
                    });
            })
            ->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'Cannot launch — another launched promo overlaps this date range.',
            ], 422);
        }

        $discount->status = 'launched';
        $discount->activated_at = now();
        $discount->save();

        return response()->json(['message' => 'Promo launched.']);
    }


    // 🟡 Cancel promo
    public function cancel($id)
    {
        $discount = ServiceDiscount::findOrFail($id);

        if ($discount->status !== 'launched') {
            return response()->json(['message' => 'Only launched promos can be canceled.'], 422);
        }

        if (!$discount->activated_at || now()->diffInHours($discount->activated_at) > 24) {
            return response()->json(['message' => 'Cancel period has expired.'], 403);
        }

        $discount->status = 'canceled';
        $discount->save();

        return response()->json(['message' => 'Promo canceled.']);
    }

    public function allActivePromos()
    {
        $promos = ServiceDiscount::with('service')
            ->whereIn('status', ['planned', 'launched'])
            ->orderBy('start_date')
            ->get();

        return response()->json($promos);
    }

}
