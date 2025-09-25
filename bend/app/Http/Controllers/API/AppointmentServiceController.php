<?php

namespace App\Http\Controllers\API;

use Carbon\Carbon;
use App\Models\Service;
use Illuminate\Http\Request;
use App\Models\ClinicCalendar;
use App\Models\ServiceDiscount;
use App\Http\Controllers\Controller;
use App\Models\ClinicWeeklySchedule;

class AppointmentServiceController extends Controller
{
    public function availableServices(Request $request)
    {
        $date = $request->query('date');
        if (!$date || !Carbon::hasFormat($date, 'Y-m-d')) {
            return response()->json(['message' => 'Invalid or missing date.'], 422);
        }

        $carbonDate = Carbon::parse($date);
        $dayOfWeek = $carbonDate->dayOfWeek; // 0 = Sunday, 6 = Saturday

        // 1. Check if clinic is open on that date
        $override = ClinicCalendar::whereDate('date', $date)->first();
        $isOpen = false;

        if ($override) {
            $isOpen = $override->is_open;
        } else {
            $weekly = ClinicWeeklySchedule::where('weekday', $dayOfWeek)->first();
            $isOpen = $weekly && $weekly->is_open;
        }

        if (!$isOpen) {
            return response()->json([
                'message' => 'Clinic is closed on the selected date.',
                'services' => []
            ]);
        }

        // 2. Promo logic: get launched promos and deduplicate
        $activePromos = ServiceDiscount::with('service')
            ->where('status', 'launched')
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->get();

        $promoServiceIds = $activePromos->pluck('service_id')->toArray();

        $latestPromos = $activePromos
            ->groupBy('service_id')
            ->map(function ($group) {
                return $group->sortByDesc('start_date')->first();
            });

        $promoServices = $latestPromos->map(function ($promo) {
            $originalPrice = $promo->service->price;
            $discountPrice = $promo->discounted_price;
            $percent = $originalPrice > 0
                ? min(round(100 - ($discountPrice / $originalPrice * 100)), 100)
                : 100;

            return [
                'id' => $promo->service->id,
                'name' => $promo->service->name,
                'type' => 'promo',
                'original_price' => $originalPrice,
                'promo_price' => $discountPrice,
                'discount_percent' => $percent,
            ];
        })->values();

        // 3. Regular services (exclude those with promo)
        $regularServices = Service::where('is_special', false)
            ->whereNotIn('id', $promoServiceIds)
            ->get()
            ->map(function ($service) {
                return [
                    'id' => $service->id,
                    'name' => $service->name,
                    'type' => 'regular',
                    'price' => $service->price
                ];
            });

        // 4. Special services (permanent or date-limited)
        $specialServices = Service::where('is_special', true)->get()->filter(function ($service) use ($carbonDate) {
            if (!$service->special_start_date && !$service->special_end_date) {
                return true;
            }

            return $service->special_start_date &&
                $service->special_end_date &&
                $carbonDate->between($service->special_start_date, $service->special_end_date);
        })->map(function ($service) {
            return [
                'id' => $service->id,
                'name' => $service->name,
                'type' => 'special',
                'price' => $service->price,
                'special_until' => optional($service->special_end_date)?->toDateString(),
            ];
        });

        // 5. Combine all results
        $combined = $regularServices
            ->concat($specialServices)
            ->concat($promoServices)
            ->values();

        return response()->json($combined);
    }


}
