<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Payment extends Model
{
    use HasFactory;

    // ---- Status constants (avoid typos) ----
    public const STATUS_UNPAID           = 'unpaid';
    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    public const STATUS_PAID             = 'paid';
    public const STATUS_FAILED           = 'failed';
    public const STATUS_CANCELLED        = 'cancelled';

    // Default values (useful when creating rows)
    protected $attributes = [
        'currency' => 'PHP',
        'status'   => self::STATUS_UNPAID,
    ];

    protected $fillable = [
        'appointment_id',
        'patient_visit_id',
        'currency',
        'amount_due',
        'amount_paid',
        'method',
        'status',
        'reference_no',
        'maya_checkout_id',
        'maya_payment_id',
        'rrn',
        'auth_code',
        'redirect_url',
        'paid_at',
        'cancelled_at',
        'expires_at',
        'webhook_first_received_at',
        'webhook_last_payload',
        'meta',
        'created_by',
    ];

    protected $casts = [
        'amount_due'                => 'decimal:2',
        'amount_paid'               => 'decimal:2',
        'paid_at'                   => 'datetime',
        'cancelled_at'              => 'datetime',
        'expires_at'                => 'datetime',
        'webhook_first_received_at' => 'datetime',
        'webhook_last_payload'      => 'array',
        'meta'                      => 'array',
    ];

    // ---- Relationships ----
    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function patientVisit()
    {
        return $this->belongsTo(PatientVisit::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ---- Query scopes ----
    public function scopeAwaiting($q)
    {
        return $q->where('status', self::STATUS_AWAITING_PAYMENT);
    }

    public function scopePaid($q)
    {
        return $q->where('status', self::STATUS_PAID);
    }

    public function scopeUnpaid($q)
    {
        return $q->where('status', self::STATUS_UNPAID);
    }

    // ---- Helpers / Accessors ----
    public function markPaid(): void
    {
        $this->forceFill([
            'status'      => self::STATUS_PAID,
            'amount_paid' => $this->amount_due,
            'paid_at'     => now(),
        ])->save();
    }

    public function markCancelled(): void
    {
        $this->forceFill([
            'status'       => self::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ])->save();
    }

    public function markFailed(): void
    {
        $this->forceFill([
            'status' => self::STATUS_FAILED,
        ])->save();
    }

    // Boolean accessor: $payment->is_paid
    public function getIsPaidAttribute(): bool
    {
        return $this->status === self::STATUS_PAID;
    }
}