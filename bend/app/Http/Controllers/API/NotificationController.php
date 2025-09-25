<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $req)
    {
        $u = $req->user();
        $now = now();

        $targeted = DB::table('notifications as n')
            ->join('notification_targets as t', 't.notification_id', '=', 'n.id')
            ->where('t.user_id', $u->id)
            ->selectRaw("
            n.id, n.type, n.title, n.body, n.severity, n.scope,
            n.audience_roles, n.effective_from, n.effective_until,
            n.data, n.created_at,
            t.seen_at, t.read_at
        ");

        $broadcast = DB::table('notifications as n')
            ->leftJoin('notification_targets as t', function ($j) use ($u) {
                $j->on('t.notification_id', '=', 'n.id')->where('t.user_id', '=', $u->id);
            })
            ->where('n.scope', 'broadcast')
            ->where(function ($q) use ($u) {
                $role = $u->role ?? 'patient';
                $q->whereNull('n.audience_roles')
                    ->orWhereJsonContains('n.audience_roles', $role);
            })
            // show only currently effective broadcasts
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_from')->orWhere('n.effective_from', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_until')->orWhere('n.effective_until', '>=', $now);
            })
            // IMPORTANT: only include broadcasts that don't yet have a target row for this user
            ->whereNull('t.id')
            ->selectRaw("
            n.id, n.type, n.title, n.body, n.severity, n.scope,
            n.audience_roles, n.effective_from, n.effective_until,
            n.data, n.created_at,
            t.seen_at, t.read_at
        ");

        // Order after UNION safely by wrapping as subquery
        $rows = DB::query()
            ->fromSub($targeted->unionAll($broadcast), 'x')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rows);
    }


    public function unreadCount(Request $req)
    {
        $u = $req->user();
        $now = now();

        // Targeted: unread rows already materialized for this user
        $targeted = DB::table('notification_targets as t')
            ->where('t.user_id', $u->id)
            ->whereNull('t.read_at')
            ->count();

        // Broadcast: role-matched AND currently effective (from..until), with no read_at for this user
        $broadcastUnread = DB::table('notifications as n')
            ->leftJoin('notification_targets as t', function ($j) use ($u) {
                $j->on('t.notification_id', '=', 'n.id')
                    ->where('t.user_id', '=', $u->id);
            })
            ->where('n.scope', 'broadcast')
            ->where(function ($q) use ($u) {
                $role = $u->role ?? 'patient';
                $q->whereNull('n.audience_roles')
                    ->orWhereJsonContains('n.audience_roles', $role);
            })
            // NEW: must have started (or no start)
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_from')
                    ->orWhere('n.effective_from', '<=', $now);
            })
            // existing: not yet expired (or no end)
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_until')
                    ->orWhere('n.effective_until', '>=', $now);
            })
            // unread for this user (includes “no target row yet” because t.read_at is NULL)
            ->whereNull('t.read_at')
            ->count();

        return response()->json(['unread' => $targeted + $broadcastUnread]);
    }


    public function markAllRead(Request $req)
    {
        $u = $req->user();
        $now = now();

        // 1) Targeted: mark all unread for this user
        DB::table('notification_targets')
            ->where('user_id', $u->id)
            ->whereNull('read_at')
            ->update([
                'seen_at' => $now,
                'read_at' => $now,
                'updated_at' => $now,
            ]);

        // 2) Broadcasts: role-matched, currently effective → materialize & mark read
        $broadcastIds = DB::table('notifications as n')
            ->where('n.scope', 'broadcast')
            ->where(function ($q) use ($u) {
                $role = $u->role ?? 'patient';
                $q->whereNull('n.audience_roles')
                    ->orWhereJsonContains('n.audience_roles', $role);
            })
            // must have started
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_from')
                    ->orWhere('n.effective_from', '<=', $now);
            })
            // not yet expired
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_until')
                    ->orWhere('n.effective_until', '>=', $now);
            })
            ->pluck('n.id')
            ->all();

        if (!empty($broadcastIds)) {
            $existing = DB::table('notification_targets')
                ->where('user_id', $u->id)
                ->whereIn('notification_id', $broadcastIds)
                ->pluck('notification_id')
                ->all();

            $missing = array_values(array_diff($broadcastIds, $existing));

            if (!empty($missing)) {
                $rows = array_map(fn($nid) => [
                    'notification_id' => $nid,
                    'user_id' => $u->id,
                    'seen_at' => $now,
                    'read_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $missing);

                DB::table('notification_targets')->insert($rows);
            }

            DB::table('notification_targets')
                ->where('user_id', $u->id)
                ->whereIn('notification_id', $broadcastIds)
                ->whereNull('read_at')
                ->update([
                    'seen_at' => $now,
                    'read_at' => $now,
                    'updated_at' => $now,
                ]);
        }

        return response()->json(['ok' => true]);
    }


    public function mine(Request $req)
    {
        $u = $req->user();
        $perPage = max(5, min((int) $req->query('perPage', 20), 100));
        $page = max(1, (int) $req->query('page', 1));

        $q = DB::table('notifications as n')
            ->join('notification_targets as t', 't.notification_id', '=', 'n.id')
            ->where('t.user_id', $u->id)
            ->whereNotNull('t.seen_at') // show only items this account has actually seen
            ->orderByDesc('n.created_at')
            ->selectRaw("
            n.id, n.type, n.title, n.body, n.severity, n.scope,
            n.audience_roles, n.effective_from, n.effective_until,
            n.data, n.created_at,
            t.seen_at, t.read_at
        ");

        $total = (clone $q)->count();
        $items = $q->forPage($page, $perPage)->get();

        return response()->json([
            'items' => $items,
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'totalPages' => (int) ceil($total / $perPage),
        ]);
    }
}
