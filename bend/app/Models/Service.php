<?php

namespace App\Models;

use App\Models\ServiceBundleItem;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $fillable = [
        'name',
        'description',
        'price',
        'category',
        'is_excluded_from_analytics',
        'is_special',
        'special_start_date',
        'special_end_date',
        'estimated_minutes',
    ];

    public function discounts()
    {
        return $this->hasMany(ServiceDiscount::class);
    }

    public function getPriceForDate($date)
    {
        $discount = $this->discounts()
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->where('status', 'launched')
            ->whereDate('activated_at', '<=', now()->subDay()->toDateString()) // must be activated for at least 1 day
            ->first();

        return $discount ? $discount->discounted_price : $this->price;
    }

    public function isCurrentlyActiveSpecial(): bool
    {
        if (!$this->is_special)
            return false;

        $today = now()->toDateString();

        return $this->special_start_date <= $today && $this->special_end_date >= $today;
    }

    public function bundleItems()
    {
        return $this->hasMany(ServiceBundleItem::class, 'parent_service_id');
    }

    public function bundledServices()
    {
        return $this->belongsToMany(Service::class, 'service_bundle_items', 'parent_service_id', 'child_service_id');
    }


}
