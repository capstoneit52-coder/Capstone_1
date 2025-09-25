<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatch extends Model
{
    protected $fillable = [
        'item_id',
        'lot_number',
        'batch_number',
        'expiry_date',
        'qty_received',
        'qty_on_hand',
        'cost_per_unit',
        'supplier_id',
        'invoice_no',
        'invoice_date',
        'received_at',
        'received_by',
        'pack_size',
    ];

    protected $casts = [
        'expiry_date' => 'date',
        'invoice_date' => 'date',
        'received_at' => 'datetime',
        'qty_received' => 'decimal:3',
        'qty_on_hand' => 'decimal:3',
        'cost_per_unit' => 'decimal:2',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class, 'batch_id');
    }

    // Quick guard to know if this batch is expired at 'now'
    public function getIsExpiredAttribute(): bool
    {
        return !is_null($this->expiry_date) && $this->expiry_date->isPast();
    }
}
