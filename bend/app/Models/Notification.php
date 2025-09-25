<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'title',
        'body',
        'severity',
        'scope',
        'audience_roles',
        'effective_from',
        'effective_until',
        'data',
        'created_by',
    ];

    protected $casts = [
        'audience_roles' => 'array',   // stored as JSON
        'data'           => 'array',   // stored as JSON
        'effective_from' => 'datetime',
        'effective_until'=> 'datetime',
    ];

    /* ----------------- Relationships ----------------- */

    public function targets()
    {
        return $this->hasMany(NotificationTarget::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /* ----------------- Helpers / Scopes ----------------- */

    public function isActive(): bool
    {
        $now = now();
        return (!$this->effective_from || $this->effective_from->lte($now))
            && (!$this->effective_until || $this->effective_until->gte($now));
    }

    /**
     * Only notifications that are currently active (effective window).
     */
    public function scopeActive(Builder $q): Builder
    {
        $now = now();
        return $q->where(function ($w) use ($now) {
            $w->whereNull('effective_from')->orWhere('effective_from', '<=', $now);
        })->where(function ($w) use ($now) {
            $w->whereNull('effective_until')->orWhere('effective_until', '>=', $now);
        });
    }

    /**
     * Broadcasts that match a given role (or have no audience restriction).
     */
    public function scopeBroadcastForRole(Builder $q, string $role): Builder
    {
        return $q->where('scope', 'broadcast')
                 ->where(function ($w) use ($role) {
                     $w->whereNull('audience_roles')
                       ->orWhereJsonContains('audience_roles', $role);
                 });
    }

    public function scopeActiveBroadcastForRole(Builder $q, string $role): Builder
    {
        return $q->broadcastForRole($role)->active();
    }
}
