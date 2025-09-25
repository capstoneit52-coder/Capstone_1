<?php

namespace App\Http\Controllers\API;

use Carbon\Carbon;
use App\Models\Supplier;
use App\Models\AppSetting;
use App\Models\PatientVisit;
use Illuminate\Http\Request;
use App\Models\InventoryItem;
use App\Models\InventoryBatch;
use Illuminate\Validation\Rule;
use App\Models\InventoryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use App\Services\NotificationService;

class InventoryController extends Controller
{
    /**
     * POST /api/inventory/receive
     * Body: item_id, qty_received, received_at (<=24h past), cost_per_unit?, lot_number?, expiry_date?, supplier_id?, invoice_no?, invoice_date?, batch_number?, pack_size?, notes?
     */
    public function receive(Request $request)
    {
        // 🚧 Policy: staff can only receive if toggle is ON
        if (!auth()->user()?->can('admin') && !AppSetting::staffCanReceive()) {
            return response()->json(['message' => 'Receiving is disabled for staff.'], 403);
        }

        $validated = $request->validate([
            'item_id' => ['required', 'exists:inventory_items,id'],
            'qty_received' => ['required', 'numeric', 'min:0.001'],
            'received_at' => ['required', 'date'],
            'cost_per_unit' => ['nullable', 'numeric', 'min:0'],

            'lot_number' => ['nullable', 'string', 'max:255'],
            'batch_number' => ['required', 'string', 'max:255'],
            'expiry_date' => ['nullable', 'date', 'after:today'],

            'supplier_id' => ['nullable', Rule::exists('suppliers', 'id')],
            'invoice_no' => ['nullable', 'string', 'max:255'],
            'invoice_date' => ['nullable', 'date'],

            'pack_size' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        // ⏱️ 24h backdating rule (not in future)
        $receivedAt = Carbon::parse($validated['received_at']);
        if ($receivedAt->lt(now()->subDay()) || $receivedAt->gt(now())) {
            return response()->json(['message' => 'received_at must be within the last 24 hours and not in the future.'], 422);
        }

        $item = InventoryItem::findOrFail($validated['item_id']);

        // 💊 Drugs require lot + expiry
        if ($item->type === 'drug') {
            if (empty($validated['lot_number']) || empty($validated['expiry_date'])) {
                return response()->json(['message' => 'Drugs require lot_number and expiry_date.'], 422);
            }
        }

        // 🔁 Transaction: create batch + movement
        $result = DB::transaction(function () use ($validated, $item, $receivedAt) {
            $batch = InventoryBatch::create([
                'item_id' => $item->id,
                'lot_number' => $validated['lot_number'] ?? null,
                'batch_number' => $validated['batch_number'] ?? null,
                'expiry_date' => $validated['expiry_date'] ?? null,
                'qty_received' => $validated['qty_received'],
                'qty_on_hand' => $validated['qty_received'],
                'cost_per_unit' => $validated['cost_per_unit'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'invoice_no' => $validated['invoice_no'] ?? null,
                'invoice_date' => $validated['invoice_date'] ?? null,
                'received_at' => $receivedAt,
                'received_by' => auth()->id(),
                'pack_size' => $validated['pack_size'] ?? null,
            ]);

            $movement = InventoryMovement::create([
                'item_id' => $item->id,
                'batch_id' => $batch->id,
                'type' => InventoryMovement::TYPE_RECEIVE,
                'quantity' => $validated['qty_received'],
                'cost_at_time' => $validated['cost_per_unit'] ?? null,
                'user_id' => auth()->id(),
                'notes' => $validated['notes'] ?? null,
            ]);

            return compact('batch', 'movement');
        });

        return response()->json($result, 201);
    }

    /**
     * POST /api/inventory/consume
     * Body: item_id, quantity, ref_type?, ref_id?, notes?
     * FEFO across batches; splits consumption over multiple batches if needed.
     */
    public function consume(Request $request)
    {
        $validated = $request->validate([
            'item_id' => ['required', 'exists:inventory_items,id'],
            'quantity' => ['required', 'numeric', 'min:0.001'],
            'ref_type' => ['nullable', Rule::in(['appointment', 'visit'])],
            'ref_id' => ['nullable', 'integer'],
            'notes' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        // Staff must consume only from a FINISHED visit
        if ($user?->role === 'staff') {
            if (($validated['ref_type'] ?? null) !== 'visit' || empty($validated['ref_id'])) {
                return response()->json(['message' => 'Consumption by staff requires a finished visit.'], 422);
            }
            $visit = PatientVisit::find($validated['ref_id']);
            if (!$visit) {
                return response()->json(['message' => 'Visit not found.'], 404);
            }
            if ($visit->status !== 'finished') { // adjust if your status differs
                return response()->json(['message' => 'Visit must be finished before consuming stock.'], 422);
            }
        }

        $item = InventoryItem::with([
            'batches' => function ($q) {
                $q->where('qty_on_hand', '>', 0)
                    ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
                    ->orderBy('expiry_date', 'asc')
                    ->orderBy('received_at', 'asc')
                    ->lockForUpdate();
            }
        ])->findOrFail($validated['item_id']);

        $totalOnHand = (float) $item->batches->sum('qty_on_hand');
        if ((float) $validated['quantity'] > $totalOnHand) {
            return response()->json([
                'message' => 'Insufficient stock. Requested ' . $validated['quantity'] . ' but only ' . $totalOnHand . ' available.'
            ], 422);
        }

        $result = DB::transaction(function () use ($item, $validated, $user) {
            $remaining = (float) $validated['quantity'];
            $movements = [];

            foreach ($item->batches as $batch) {
                if ($remaining <= 0)
                    break;

                $take = min($remaining, (float) $batch->qty_on_hand);

                $batch->qty_on_hand = (float) $batch->qty_on_hand - $take;
                $batch->save();

                $movements[] = InventoryMovement::create([
                    'item_id' => $item->id,
                    'batch_id' => $batch->id,
                    'type' => InventoryMovement::TYPE_CONSUME,
                    'quantity' => $take,
                    'ref_type' => $validated['ref_type'] ?? null,
                    'ref_id' => $validated['ref_id'] ?? null,
                    'user_id' => $user?->id,
                    'notes' => $validated['notes'] ?? null,
                ]);

                $remaining -= $take;
            }

            return ['consumed_total' => (float) $validated['quantity'], 'movements' => $movements];
        });

        // 🔔 Low-stock alert after consumption
        $item->refresh();
        if ($item->low_stock_threshold > 0) {
            $total = (float) $item->batches()->sum('qty_on_hand');
            if ($total <= (float) $item->low_stock_threshold) {
                NotificationService::notifyLowStock($item, $total);
            }
        }

        return response()->json($result, 201);
    }


    /**
     * POST /api/inventory/adjust
     * Body: item_id, batch_id (required), direction (increase|decrease), quantity, adjust_reason, notes?
     * Admin-only. Keeps batches immutable structure; requires batch context.
     */
    public function adjust(Request $request)
    {
        $request->merge([
            'item_id' => (int) $request->input('item_id'),
            'batch_id' => (int) $request->input('batch_id'),
        ]);
        Log::debug('Inventory.adjust incoming', $request->only(
            'item_id',
            'batch_id',
            'direction',
            'quantity',
            'adjust_reason'
        ));

        $validated = $request->validate([
            'item_id' => ['required', 'integer', 'exists:inventory_items,id'],
            'batch_id' => ['required', 'integer'], // no Rule::exists here
            'direction' => ['required', Rule::in(['increase', 'decrease'])],
            'quantity' => ['required', 'numeric', 'min:0.001'],
            'adjust_reason' => ['required', Rule::in(InventoryMovement::ADJUST_REASONS)],
            'notes' => ['nullable', 'string'],
        ]);

        $result = DB::transaction(function () use ($validated) {
            // definitive pairing + lock
            $batch = InventoryBatch::where('id', $validated['batch_id'])
                ->where('item_id', $validated['item_id'])
                ->lockForUpdate()
                ->first();

            if (!$batch) {
                // TEMP debug — remove after verifying
                $exists = InventoryBatch::find($validated['batch_id']);
                return response()->json([
                    'message' => 'The selected batch is invalid for the chosen item.',
                    'debug_ids' => ['sent_item_id' => $validated['item_id'], 'sent_batch_id' => $validated['batch_id']],
                    'debug_db' => [
                        'batch_row_exists' => (bool) $exists,
                        'batch_item_id' => $exists?->item_id,
                    ],
                ], 422);
            }

            $qty = (float) $validated['quantity'];

            if ($validated['direction'] === 'decrease') {
                if ($qty > (float) $batch->qty_on_hand) {
                    return response()->json(['message' => 'Cannot decrease below zero.'], 422);
                }
                $batch->qty_on_hand -= $qty;
            } else {
                $batch->qty_on_hand += $qty;
            }
            $batch->save();

            $movement = InventoryMovement::create([
                'item_id' => $batch->item_id,
                'batch_id' => $batch->id,
                'type' => InventoryMovement::TYPE_ADJUST,
                'quantity' => $qty,
                'adjust_reason' => $validated['adjust_reason'],
                'user_id' => auth()->id(),
                'notes' => $validated['notes'] ?? null,
            ]);

            return compact('batch', 'movement');
        });

        if ($result instanceof JsonResponse)
            return $result;

        $item = InventoryItem::find($validated['item_id']);
        if ($validated['direction'] === 'decrease' && $item && $item->low_stock_threshold > 0) {
            $total = (float) $item->batches()->sum('qty_on_hand');
            if ($total <= (float) $item->low_stock_threshold) {
                NotificationService::notifyLowStock($item, $total);
            }
        }

        return response()->json($result, 201);
    }



    public function batches(InventoryItem $item)
    {
        $batches = $item->batches()
            ->select('id', 'item_id', 'lot_number', 'batch_number', 'expiry_date', 'qty_on_hand', 'received_at')
            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expiry_date', 'asc')
            ->orderBy('received_at', 'asc')
            ->get();

        // TEMP: write the payload to laravel.log
        Log::debug('Inventory.batches response', [
            'item_id' => $item->id,
            'count' => $batches->count(),
            'batches' => $batches->map(function ($b) {
                return [
                    'id' => $b->id,
                    'item_id' => $b->item_id,
                    'lot_number' => $b->lot_number,
                    'batch_number' => $b->batch_number,
                    'expiry_date' => optional($b->expiry_date)?->toDateString(),
                    'qty_on_hand' => (string) $b->qty_on_hand,
                    'received_at' => optional($b->received_at)?->toDateTimeString(),
                ];
            })->values()->all(),
        ]);

        return response()->json(['batches' => $batches]);
    }


    public function suppliers()
    {
        return Supplier::orderBy('name')->get(['id', 'name']);
    }

    public function storeSupplier(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:suppliers,name'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $supplier = Supplier::create($data);

        // keep the payload small; FE only needs these right away
        return response()->json([
            'id' => $supplier->id,
            'name' => $supplier->name,
        ], 201);
    }
}
