<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceGoal extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_type',
        'period_start',
        'metric',
        'target_value',
        'status',
        'created_by',
    ];

    protected $casts = [
        'period_start' => 'date',
        'target_value' => 'integer',
    ];

    public function snapshots()
    {
        return $this->hasMany(GoalProgressSnapshot::class, 'goal_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

