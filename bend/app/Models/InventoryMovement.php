<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    public const TYPE_RECEIVE = 'receive';
    public const TYPE_CONSUME = 'consume';
    public const TYPE_ADJUST = 'adjust';

    public const ADJUST_REASONS = [
        'damaged',
        'expired',
        'count_correction',
        'return_to_supplier',
        'stock_take_variance',
        'theft',
        'other',
    ];


    protected $fillable = [
        'item_id',
        'batch_id',
        'type',
        'quantity',
        'adjust_reason',
        'ref_type',
        'ref_id',
        'cost_at_time',
        'user_id',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'cost_at_time' => 'decimal:2',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'item_id');
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(InventoryBatch::class, 'batch_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Convenience checks
    public function isReceive(): bool
    {
        return $this->type === self::TYPE_RECEIVE;
    }
    public function isConsume(): bool
    {
        return $this->type === self::TYPE_CONSUME;
    }
    public function isAdjust(): bool
    {
        return $this->type === self::TYPE_ADJUST;
    }
}
