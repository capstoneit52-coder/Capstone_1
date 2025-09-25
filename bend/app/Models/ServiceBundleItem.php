<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceBundleItem extends Model
{
    protected $fillable = [
        'parent_service_id',
        'child_service_id',
    ];

    // Parent package (the service marked as a bundle)
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'parent_service_id');
    }

    // Child service included in the package
    public function child(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'child_service_id');
    }
}
