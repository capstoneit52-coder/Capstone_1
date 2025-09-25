<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicCalendar extends Model
{
    protected $table = 'clinic_calendar';

    protected $fillable = [
        'date',
        'is_open',
        'open_time',
        'close_time',
        'max_per_block_override',   // NEW: capacity cap
        'is_generated',             // NEW: hide capacity rows from overrides UI
        'note',
    ];

    protected $casts = [
        'date' => 'date',
        'is_open' => 'boolean',
        'is_generated' => 'boolean',
    ];
}