<?php

namespace App\Console\Commands;

use App\Models\GoalProgressSnapshot;
use App\Models\PerformanceGoal;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class UpdateGoalProgress extends Command
{
    protected $signature = 'goals:update-progress';
    protected $description = 'Compute actual metric values for active goals and update statuses on period end';

    public function handle(): int
    {
        $today = Carbon::today();
        $activeGoals = PerformanceGoal::query()
            ->where('status', 'active')
            ->get();

        foreach ($activeGoals as $goal) {
            $periodStart = Carbon::parse($goal->period_start)->startOfMonth();
            $periodEnd = (clone $periodStart)->endOfMonth();

            $actual = 0;
            switch ($goal->metric) {
                case 'total_visits':
                    $actual = DB::table('patient_visits')
                        ->whereNotNull('start_time')
                        ->whereBetween('start_time', [$periodStart, $periodEnd])
                        ->count();
                    break;
                default:
                    $actual = 0;
            }

            GoalProgressSnapshot::updateOrCreate(
                [
                    'goal_id' => $goal->id,
                    'as_of_date' => $today,
                ],
                [
                    'actual_value' => $actual,
                ]
            );

            if ($today->greaterThanOrEqualTo($periodEnd)) {
                $goal->status = ($actual >= (int)$goal->target_value) ? 'done' : 'missed';
                $goal->save();
            }
        }

        $this->info('Goal progress updated for ' . $activeGoals->count() . ' goals.');
        return Command::SUCCESS;
    }
}

