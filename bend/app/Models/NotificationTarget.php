<?php

namespace App\Models;

use App\Models\Notification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NotificationTarget extends Model
{
    use HasFactory;

    protected $fillable = [
        'notification_id',
        'user_id',
        'seen_at',
        'read_at',
    ];

    protected $casts = [
        'seen_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function notification()
    {
        return $this->belongsToMany(
            Notification::class,
            'notification_targets',
            'user_id',
            'notification_id'
        )->withPivot(['seen_at','read_at'])
         ->withTimestamps();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
