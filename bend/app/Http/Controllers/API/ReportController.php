<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function visitsMonthly(Request $request)
    {
        $month = $request->query('month'); // expected format YYYY-MM

        if (!is_string($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            $start = now()->startOfMonth();
        } else {
            try {
                $start = Carbon::createFromFormat('Y-m-d', $month . '-01')->startOfMonth();
            } catch (\Exception $e) {
                $start = now()->startOfMonth();
            }
        }

        $end = (clone $start)->endOfMonth();
        $daysInMonth = $start->daysInMonth;

        // Base scope: visits that started within the month
        $base = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end]);

        // Totals
        $totalVisits = (clone $base)->count();

        // By day
        $byDayRows = (clone $base)
            ->selectRaw('DATE(v.start_time) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        // By hour (0-23)
        $byHourRows = (clone $base)
            ->selectRaw('HOUR(v.start_time) as hour, COUNT(*) as count, (COUNT(*) / ?) as avg_per_day', [$daysInMonth])
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // By visit type (infer appointment vs walk-in using correlated subquery similar to controller logic)
        $byVisitTypeRows = (clone $base)
            ->selectRaw(
                "CASE WHEN EXISTS (\n" .
                "  SELECT 1 FROM appointments a\n" .
                "  WHERE a.patient_id = v.patient_id\n" .
                "    AND a.service_id = v.service_id\n" .
                "    AND a.date = v.visit_date\n" .
                "    AND a.status IN ('approved','completed')\n" .
                ") THEN 'appointment' ELSE 'walkin' END as visit_type, COUNT(*) as count"
            )
            ->groupBy('visit_type')
            ->orderBy('visit_type')
            ->get();

        // By service
        $byServiceRows = (clone $base)
            ->leftJoin('services as s', 's.id', '=', 'v.service_id')
            ->selectRaw("v.service_id, COALESCE(s.name, '(Unspecified)') as service_name, COUNT(*) as count")
            ->groupBy('v.service_id', 's.name')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'month' => $start->format('Y-m'),
            'totals' => [
                'visits' => $totalVisits,
            ],
            'by_day' => $byDayRows,
            'by_hour' => $byHourRows->map(function ($r) {
                return [
                    'hour' => $r->hour,
                    'count' => $r->count,
                ];
            }),
            'by_hour_avg_per_day' => $byHourRows->map(function ($r) {
                return [
                    'hour' => $r->hour,
                    'avg_per_day' => round((float)$r->avg_per_day, 2),
                ];
            }),
            'by_visit_type' => $byVisitTypeRows,
            'by_service' => $byServiceRows,
        ]);
    }

    public function analyticsSummary(Request $request)
    {
        // Accept either 'month' or 'period' (YYYY-MM). Default: current month
        $month = $request->query('month') ?? $request->query('period');
        if (!is_string($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            $start = now()->startOfMonth();
        } else {
            try {
                $start = Carbon::createFromFormat('Y-m-d', $month . '-01')->startOfMonth();
            } catch (\Exception $e) {
                $start = now()->startOfMonth();
            }
        }

        $end = (clone $start)->endOfMonth();
        $prevStart = (clone $start)->subMonth()->startOfMonth();
        $prevEnd = (clone $start)->subMonth()->endOfMonth();

        $safePct = function (float $curr, float $prev): float {
            if ($prev == 0.0) {
                return $curr > 0 ? 100.0 : 0.0;
            }
            return round((($curr - $prev) / $prev) * 100.0, 2);
        };

        // Total visits (started within month)
        $visitsCurr = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end])
            ->count();
        $visitsPrev = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$prevStart, $prevEnd])
            ->count();

        // Approved appointments (by appointment date)
        $approvedCurr = DB::table('appointments')
            ->where('status', 'approved')
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->count();
        $approvedPrev = DB::table('appointments')
            ->where('status', 'approved')
            ->whereBetween('date', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->count();

        // No-shows (by appointment date). If schema doesn't include no_show, this will be zero
        $noShowCurr = DB::table('appointments')
            ->where('status', 'no_show')
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->count();
        $noShowPrev = DB::table('appointments')
            ->where('status', 'no_show')
            ->whereBetween('date', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->count();

        // Average visit duration (minutes) for completed/finished visits with end_time
        $avgDurCurr = (float) (DB::table('patient_visits')
            ->whereNotNull('start_time')
            ->whereNotNull('end_time')
            ->whereBetween('start_time', [$start, $end])
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_min')
            ->value('avg_min') ?? 0);
        $avgDurPrev = (float) (DB::table('patient_visits')
            ->whereNotNull('start_time')
            ->whereNotNull('end_time')
            ->whereBetween('start_time', [$prevStart, $prevEnd])
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_min')
            ->value('avg_min') ?? 0);

        // Top services (by visits)
        $topServicesCurr = DB::table('patient_visits as v')
            ->leftJoin('services as s', 's.id', '=', 'v.service_id')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end])
            ->selectRaw('v.service_id, COALESCE(s.name, "(Unspecified)") as service_name, COUNT(*) as count')
            ->groupBy('v.service_id', 's.name')
            ->orderByDesc('count')
            ->limit(5)
            ->get();
        $serviceIds = $topServicesCurr->pluck('service_id')->filter()->all();
        $prevCountsByService = collect();
        if (!empty($serviceIds)) {
            $prevCountsByService = DB::table('patient_visits as v')
                ->whereNotNull('v.start_time')
                ->whereBetween('v.start_time', [$prevStart, $prevEnd])
                ->whereIn('v.service_id', $serviceIds)
                ->selectRaw('v.service_id, COUNT(*) as count')
                ->groupBy('v.service_id')
                ->pluck('count', 'service_id');
        }
        $topServices = $topServicesCurr->map(function ($row) use ($prevCountsByService, $safePct) {
            $prev = (float) ($prevCountsByService[$row->service_id] ?? 0);
            $curr = (float) $row->count;
            return [
                'service_id' => $row->service_id,
                'service_name' => $row->service_name,
                'count' => (int) $curr,
                'prev_count' => (int) $prev,
                'pct_change' => $safePct($curr, $prev),
            ];
        });

        // Payment method share (cash vs hmo) from paid payments in the month
        $payCurr = DB::table('payments')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->whereIn('method', ['cash', 'hmo'])
            ->selectRaw('method, COUNT(*) as count')
            ->groupBy('method')
            ->pluck('count', 'method');
        $payPrev = DB::table('payments')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->whereIn('method', ['cash', 'hmo'])
            ->selectRaw('method, COUNT(*) as count')
            ->groupBy('method')
            ->pluck('count', 'method');

        $cashCurr = (int) ($payCurr['cash'] ?? 0);
        $hmoCurr = (int) ($payCurr['hmo'] ?? 0);
        $cashPrev = (int) ($payPrev['cash'] ?? 0);
        $hmoPrev = (int) ($payPrev['hmo'] ?? 0);
        $denomCurr = max(1, $cashCurr + $hmoCurr);
        $denomPrev = max(1, $cashPrev + $hmoPrev);
        $cashShareCurr = round(($cashCurr / $denomCurr) * 100.0, 2);
        $hmoShareCurr = round(($hmoCurr / $denomCurr) * 100.0, 2);
        $cashSharePrev = round(($cashPrev / $denomPrev) * 100.0, 2);
        $hmoSharePrev = round(($hmoPrev / $denomPrev) * 100.0, 2);

        // Simple daily series for sparkline on frontend
        $visitsByDay = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end])
            ->selectRaw('DATE(v.start_time) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        // Alerts
        $alerts = [];
        if ($approvedCurr > 0) {
            $noShowRate = round(($noShowCurr / max(1, $approvedCurr)) * 100.0, 2);
            if ($noShowRate >= 20.0) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => "High no-show rate: {$noShowRate}% of approved appointments",
                ];
            }
        }
        if ($avgDurCurr >= 100) {
            $alerts[] = [
                'type' => 'info',
                'message' => 'Average visit duration is unusually long (>= 100 minutes).',
            ];
        } elseif ($avgDurCurr > 0 && $avgDurCurr <= 25) {
            $alerts[] = [
                'type' => 'info',
                'message' => 'Average visit duration is quite short (<= 25 minutes).',
            ];
        }
        if (!empty($topServices[0])) {
            $top = $topServices[0];
            if ($visitsCurr > 0 && ($top['count'] / $visitsCurr) >= 0.5) {
                $alerts[] = [
                    'type' => 'info',
                    'message' => 'One service accounts for over 50% of visits. Consider balancing workload.',
                ];
            }
        }
        $shareSpike = $hmoShareCurr - $hmoSharePrev;
        if ($shareSpike >= 15.0) {
            $alerts[] = [
                'type' => 'info',
                'message' => 'HMO share increased sharply vs last month (+'.round($shareSpike, 1).' pp).',
            ];
        }

        return response()->json([
            'month' => $start->format('Y-m'),
            'previous_month' => $prevStart->format('Y-m'),
            'kpis' => [
                'total_visits' => [
                    'value' => (int) $visitsCurr,
                    'prev' => (int) $visitsPrev,
                    'pct_change' => $safePct((float) $visitsCurr, (float) $visitsPrev),
                ],
                'approved_appointments' => [
                    'value' => (int) $approvedCurr,
                    'prev' => (int) $approvedPrev,
                    'pct_change' => $safePct((float) $approvedCurr, (float) $approvedPrev),
                ],
                'no_shows' => [
                    'value' => (int) $noShowCurr,
                    'prev' => (int) $noShowPrev,
                    'pct_change' => $safePct((float) $noShowCurr, (float) $noShowPrev),
                ],
                'avg_visit_duration_min' => [
                    'value' => round($avgDurCurr, 2),
                    'prev' => round($avgDurPrev, 2),
                    'pct_change' => $safePct($avgDurCurr, $avgDurPrev),
                ],
                'payment_method_share' => [
                    'cash' => [
                        'count' => $cashCurr,
                        'share_pct' => $cashShareCurr,
                        'prev_share_pct' => $cashSharePrev,
                        'pct_point_change' => round($cashShareCurr - $cashSharePrev, 2),
                    ],
                    'hmo' => [
                        'count' => $hmoCurr,
                        'share_pct' => $hmoShareCurr,
                        'prev_share_pct' => $hmoSharePrev,
                        'pct_point_change' => round($hmoShareCurr - $hmoSharePrev, 2),
                    ],
                ],
            ],
            'top_services' => $topServices,
            'series' => [
                'visits_by_day' => $visitsByDay,
            ],
            'alerts' => $alerts,
        ]);
    }
}

