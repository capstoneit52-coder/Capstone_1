<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * SystemLogController
 * 
 * Handles system log viewing and filtering for admin users.
 * 
 * Usage Examples:
 * - GET /api/system-logs - List all logs with pagination
 * - GET /api/system-logs?category=appointment&action=created - Filter by category and action
 * - GET /api/system-logs?user_id=1&date_from=2024-01-01 - Filter by user and date range
 * - GET /api/system-logs/filter-options - Get available filter options
 * - GET /api/system-logs/statistics - Get log statistics for dashboard
 * 
 * To log events in your controllers, use:
 * SystemLogService::log('category', 'action', $subjectId, 'message', $context);
 * 
 * Or use convenience methods:
 * SystemLogService::logUser('created', $userId, 'New user registered');
 * SystemLogService::logAppointment('approved', $appointmentId, 'Appointment approved');
 * SystemLogService::logDevice('approved', $deviceId, 'Device approved');
 */
class SystemLogController extends Controller
{
    /**
     * Display a listing of system logs with filters
     */
    public function index(Request $request)
    {
        $query = SystemLog::with('user')
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('message', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('action', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate($request->get('per_page', 20));

        return response()->json($logs);
    }

    /**
     * Get filter options for the system logs
     */
    public function filterOptions()
    {
        $categories = SystemLog::distinct()
            ->pluck('category')
            ->filter()
            ->sort()
            ->values();

        $actions = SystemLog::distinct()
            ->pluck('action')
            ->filter()
            ->sort()
            ->values();

        $users = User::whereIn('id', function ($query) {
                $query->select('user_id')
                    ->from('system_logs')
                    ->whereNotNull('user_id');
            })
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json([
            'categories' => $categories,
            'actions' => $actions,
            'users' => $users,
        ]);
    }

    /**
     * Get system log statistics for dashboard
     */
    public function statistics(Request $request)
    {
        $dateFrom = $request->get('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->get('date_to', now()->format('Y-m-d'));

        $stats = [
            'total_logs' => SystemLog::whereBetween('created_at', [$dateFrom, $dateTo])->count(),
            'logs_by_category' => SystemLog::whereBetween('created_at', [$dateFrom, $dateTo])
                ->select('category', DB::raw('count(*) as count'))
                ->groupBy('category')
                ->orderBy('count', 'desc')
                ->get(),
            'logs_by_action' => SystemLog::whereBetween('created_at', [$dateFrom, $dateTo])
                ->select('action', DB::raw('count(*) as count'))
                ->groupBy('action')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get(),
            'most_active_users' => SystemLog::whereBetween('created_at', [$dateFrom, $dateTo])
                ->whereNotNull('user_id')
                ->with('user:id,name')
                ->select('user_id', DB::raw('count(*) as count'))
                ->groupBy('user_id')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get(),
            'daily_logs' => SystemLog::whereBetween('created_at', [$dateFrom, $dateTo])
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get(),
        ];

        return response()->json($stats);
    }

    /**
     * Show a specific system log entry
     */
    public function show(SystemLog $systemLog)
    {
        $systemLog->load('user');
        return response()->json($systemLog);
    }
}