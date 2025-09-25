<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientHmo extends Model
{
    use SoftDeletes;

    protected $table = 'patient_hmos';

    protected $fillable = [
        'patient_id',
        'provider_name',
        'member_id_encrypted',
        'policy_no_encrypted',
        'effective_date',
        'expiry_date',
        'is_primary',
        'notes_encrypted',
        'author_id',
    ];

    // Laravel's built-in encrypted cast (AES-256 using APP_KEY)
    // We keep the DB columns *_encrypted but expose clean accessors below.
    protected $casts = [
        'effective_date' => 'date',
        'expiry_date'    => 'date',
        'is_primary'     => 'boolean',
        'member_id_encrypted' => 'encrypted',
        'policy_no_encrypted' => 'encrypted',
        'notes_encrypted'     => 'encrypted',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}