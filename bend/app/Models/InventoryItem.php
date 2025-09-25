<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    protected $fillable = [
        'name',
        'sku_code',
        'type',                // 'drug' | 'equipment' | 'supply' | 'other'
        'unit',                // base unit (pcs, ml, g, etc.)
        'low_stock_threshold',
        'default_pack_size',
        'is_controlled',
        'is_active',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'default_pack_size' => 'decimal:3',
        'is_controlled' => 'boolean',
        'is_active' => 'boolean',
        'low_stock_threshold' => 'integer',
    ];

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class, 'item_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class, 'item_id');
    }

    // Helpers
    public function isDrug(): bool
    {
        return $this->type === 'drug';
    }

    /**
     * Next consumable batch using FEFO (earliest expiry first, then oldest received).
     */
    public function nextFefoBatch()
    {
        return $this->batches()
            ->where('qty_on_hand', '>', 0)
            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END') // prefer those with expiry
            ->orderBy('expiry_date', 'asc')
            ->orderBy('received_at', 'asc')
            ->first();
    }

    /**
     * Total on-hand across batches.
     */
    public function getTotalOnHandAttribute(): string
    {
        return (string) $this->batches()->sum('qty_on_hand');
    }
}
