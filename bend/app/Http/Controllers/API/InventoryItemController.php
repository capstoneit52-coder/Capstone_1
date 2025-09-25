<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use Illuminate\Http\Request;

class InventoryItemController extends Controller
{
    // GET /api/inventory/items?q=
    public function index(Request $request)
    {
        $q = trim((string)$request->query('q', ''));
        $items = InventoryItem::query()
            ->when($q !== '', fn($qb) => $qb->where('name','like',"%$q%")->orWhere('sku_code','like',"%$q%"))
            ->withSum('batches as total_on_hand', 'qty_on_hand')
            ->orderBy('name')
            ->paginate(10);
        return response()->json($items);
    }

    // POST /api/inventory/items
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'                => 'required|string|max:255',
            'sku_code'            => 'required|string|max:255|unique:inventory_items,sku_code',
            'type'                => 'required|in:drug,equipment,supply,other',
            'unit'                => 'required|string|max:32',
            'low_stock_threshold' => 'nullable|integer|min:0',
            'default_pack_size'   => 'nullable|numeric|min:0',
            'is_controlled'       => 'boolean',
            'notes'               => 'nullable|string',
        ]);

        $data['is_active']  = true;
        $data['created_by'] = auth()->id();

        $item = InventoryItem::create($data);
        return response()->json($item, 201);
    }
}
