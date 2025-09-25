<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GoalProgressSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'goal_id',
        'as_of_date',
        'actual_value',
    ];

    protected $casts = [
        'as_of_date' => 'date',
        'actual_value' => 'integer',
    ];

    public function goal()
    {
        return $this->belongsTo(PerformanceGoal::class, 'goal_id');
    }
}

