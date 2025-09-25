<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SystemLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category',
        'action',
        'subject_id',   
        'message',
        'context',
    ];

    protected $casts = [
        'context' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /* -------- Optional convenience scopes -------- */

    // Filter by actor (who did it)
    public function scopeByUser($q, $userId)
    {
        return $q->where('user_id', $userId);
    }

    // Filter by subject (what it was about)
    public function scopeForSubject($q, string $category, int $subjectId)
    {
        return $q->where('category', $category)
                 ->where('subject_id', $subjectId);
    }

    // Common dashboard slice
    public function scopeByAction($q, string $category, string $action)
    {
        return $q->where('category', $category)
                 ->where('action', $action);
    }
}
