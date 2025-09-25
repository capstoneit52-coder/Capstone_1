<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\GoalProgressSnapshot;
use App\Models\PerformanceGoal;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GoalController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'period_type' => ['required', Rule::in(['month'])],
            'period_start' => ['required', 'date'], // expect YYYY-MM-01
            'metric' => ['required', Rule::in(['total_visits'])],
            'target_value' => ['required', 'integer', 'min:1'],
        ]);

        $periodStart = Carbon::parse($validated['period_start'])->startOfMonth();

        $goal = PerformanceGoal::create([
            'period_type' => $validated['period_type'],
            'period_start' => $periodStart,
            'metric' => $validated['metric'],
            'target_value' => $validated['target_value'],
            'status' => 'active',
            'created_by' => $request->user()->id,
        ]);

        // If the goal is for the current month, initialize a snapshot that
        // includes visits that have already happened earlier this month.
        $today = Carbon::today();
        if ($periodStart->isSameMonth($today) && $validated['metric'] === 'total_visits') {
            $periodEnd = (clone $periodStart)->endOfMonth();
            $actual = DB::table('patient_visits')
                ->whereNotNull('start_time')
                ->whereBetween('start_time', [$periodStart, $periodEnd])
                ->count();

            GoalProgressSnapshot::updateOrCreate(
                [
                    'goal_id' => $goal->id,
                    'as_of_date' => $today,
                ],
                [
                    'actual_value' => $actual,
                ]
            );
        }

        return response()->json($goal, 201);
    }

    public function index(Request $request)
    {
        $period = $request->query('period'); // YYYY-MM
        $query = PerformanceGoal::query()->orderByDesc('period_start');

        if (is_string($period) && preg_match('/^\d{4}-\d{2}$/', $period)) {
            $start = Carbon::createFromFormat('Y-m-d', $period . '-01')->startOfMonth();
            $query->where('period_type', 'month')->whereDate('period_start', $start);
        }

        $goals = $query->with(['snapshots' => function ($q) {
            $q->orderByDesc('as_of_date')->limit(1);
        }])->get();

        $formatted = $goals->map(function (PerformanceGoal $g) {
            $latest = $g->snapshots->first();
            return [
                'id' => $g->id,
                'period_type' => $g->period_type,
                'period_start' => $g->period_start->format('Y-m-d'),
                'metric' => $g->metric,
                'target_value' => (int)$g->target_value,
                'status' => $g->status,
                'latest_actual' => (int)($latest->actual_value ?? 0),
            ];
        });

        return response()->json($formatted);
    }

    public function progress($id)
    {
        $goal = PerformanceGoal::findOrFail($id);
        $snapshots = GoalProgressSnapshot::where('goal_id', $goal->id)
            ->orderBy('as_of_date')
            ->get(['as_of_date', 'actual_value']);

        return response()->json([
            'goal' => $goal,
            'snapshots' => $snapshots,
        ]);
    }
}

