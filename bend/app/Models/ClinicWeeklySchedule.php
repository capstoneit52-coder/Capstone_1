<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClinicWeeklySchedule extends Model
{
  protected $fillable = [
    'weekday',
    'is_open',
    'open_time',
    'close_time',
    'note',
  ];

  protected $casts = [
    'weekday' => 'integer',
    'is_open' => 'boolean',
  ];
}
