<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryBatch;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class NotificationService
{
    // debounce window: do not duplicate same alert within 24h
    public const DEBOUNCE_HOURS = 24;

    /** Admin broadcast: low stock for an item */
    public static function notifyLowStock(InventoryItem $item, float $totalOnHand): ?Notification
    {
        if (!self::canFire('low_stock', ['item_id' => $item->id])) {
            return null;
        }

        // Create broadcast notification for staff and admin using ClinicCalendarController pattern
        $notificationId = DB::table('notifications')->insertGetId([
            'type' => 'low_stock',
            'title' => "Low stock: {$item->name}",
            'body' => "On-hand is {$totalOnHand} {$item->unit} (threshold: {$item->low_stock_threshold}).",
            'severity' => 'warning',
            'scope' => 'broadcast',
            'audience_roles' => json_encode(['admin', 'staff']),
            'effective_from' => now(),
            'effective_until' => null,
            'data' => json_encode([
                'item_id' => $item->id,
                'item_name' => $item->name,
                'unit' => $item->unit,
                'threshold' => (int) $item->low_stock_threshold,
                'on_hand' => (float) $totalOnHand,
            ]),
            'created_by' => null, // system
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Notification::find($notificationId);
    }

    /** Admin broadcast: near expiry for a batch */
    public static function notifyNearExpiry(InventoryBatch $batch, int $daysLeft): ?Notification
    {
        if (is_null($batch->expiry_date)) {
            return null;
        }
        if (!self::canFire('near_expiry', ['batch_id' => $batch->id])) {
            return null;
        }

        $label = $batch->batch_number ?? $batch->lot_number ?? "#{$batch->id}";
        
        // Create broadcast notification for staff and admin using ClinicCalendarController pattern
        $notificationId = DB::table('notifications')->insertGetId([
            'type' => 'near_expiry',
            'title' => "Near expiry: {$batch->item->name}",
            'body' => "Batch {$label} expires in {$daysLeft} day(s).",
            'severity' => 'info',
            'scope' => 'broadcast',
            'audience_roles' => json_encode(['admin', 'staff']),
            'effective_from' => now(),
            'effective_until' => null,
            'data' => json_encode([
                'item_id' => $batch->item_id,
                'batch_id' => $batch->id,
                'label' => $label,
                'expiry_date' => $batch->expiry_date ? $batch->expiry_date->format('Y-m-d') : null,
                'days_left' => $daysLeft,
            ]),
            'created_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Notification::find($notificationId);
    }

    /** Staff broadcast: new appointment created */
    public static function notifyNewAppointment(\App\Models\Appointment $appointment): ?Notification
    {
        $patient = $appointment->patient;
        $service = $appointment->service;
        $patientName = $patient ? "{$patient->first_name} {$patient->last_name}" : 'Unknown Patient';
        $serviceName = $service ? $service->name : 'Unknown Service';

        // Create broadcast notification for staff and admin
        $notificationId = DB::table('notifications')->insertGetId([
            'type' => 'new_appointment',
            'title' => "New Appointment: {$patientName}",
            'body' => "Patient {$patientName} has booked {$serviceName} for {$appointment->date} at {$appointment->time_slot}. Ref: {$appointment->reference_code}",
            'severity' => 'info',
            'scope' => 'broadcast',
            'audience_roles' => json_encode(['admin', 'staff']),
            'effective_from' => now(),
            'effective_until' => null,
            'data' => json_encode([
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'service_id' => $appointment->service_id,
                'reference_code' => $appointment->reference_code,
                'date' => $appointment->date,
                'time_slot' => $appointment->time_slot,
                'payment_method' => $appointment->payment_method,
                'status' => $appointment->status,
            ]),
            'created_by' => null, // system
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Notification::find($notificationId);
    }

    /** Patient targeted: appointment status change (approved/rejected) */
    public static function notifyAppointmentStatusChange(\App\Models\Appointment $appointment, string $status): ?Notification
    {
        $patient = $appointment->patient;
        $service = $appointment->service;
        $patientName = $patient ? "{$patient->first_name} {$patient->last_name}" : 'Patient';
        $serviceName = $service ? $service->name : 'your service';
        
        // Only notify if patient has a linked user account
        if (!$patient || !$patient->user_id) {
            return null;
        }

        $statusText = $status === 'approved' ? 'approved' : 'rejected';
        $severity = $status === 'approved' ? 'info' : 'warning';

        // Create targeted notification for the patient
        $notificationId = DB::table('notifications')->insertGetId([
            'type' => 'appointment_status',
            'title' => "Appointment {$statusText}: {$serviceName}",
            'body' => "Your appointment for {$serviceName} on {$appointment->date} at {$appointment->time_slot} has been {$statusText}. Ref: {$appointment->reference_code}",
            'severity' => $severity,
            'scope' => 'targeted',
            'audience_roles' => null, // targeted notifications don't use audience_roles
            'effective_from' => now(),
            'effective_until' => null,
            'data' => json_encode([
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'service_id' => $appointment->service_id,
                'reference_code' => $appointment->reference_code,
                'date' => $appointment->date,
                'time_slot' => $appointment->time_slot,
                'status' => $status,
                'payment_method' => $appointment->payment_method,
            ]),
            'created_by' => null, // system
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create targeted notification for the patient
        DB::table('notification_targets')->insert([
            'notification_id' => $notificationId,
            'user_id' => $patient->user_id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Notification::find($notificationId);
    }

    /** Has a similar alert fired within the debounce window? (uses type + key fields in JSON data) */
    protected static function canFire(string $type, array $keyData): bool
    {
        $since = Carbon::now()->subHours(self::DEBOUNCE_HOURS);

        $q = Notification::query()
            ->where('type', $type)
            ->where('created_at', '>=', $since);

        // apply JSON key filters, e.g. data->item_id == 5 OR data->batch_id == 10
        foreach ($keyData as $k => $v) {
            $q->whereJsonContains('data->'.$k, $v);
        }

        return !$q->exists();
    }
}
