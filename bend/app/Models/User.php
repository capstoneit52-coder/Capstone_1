<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Patient;
use App\Models\Notification;
use Laravel\Sanctum\HasApiTokens;
use App\Models\NotificationTarget;
use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'contact_number',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function patient()
    {
        return $this->hasOne(Patient::class);
    }

    public function notificationTargets()
    {
        return $this->hasMany(NotificationTarget::class);
    }

    // User.php
    public function notifications()
    {
        return $this->belongsToMany(
            Notification::class,
            'notification_targets',   // pivot table
            'user_id',                // FK to users
            'notification_id'         // FK to notifications
        )->withPivot(['seen_at', 'read_at']) // ⬅️ expose pivot fields
            ->withTimestamps();                // fills pivot created_at/updated_at
    }


}
