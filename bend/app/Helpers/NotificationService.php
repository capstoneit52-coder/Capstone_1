<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Log;
use App\Models\Appointment;
// use Aws\Sns\SnsClient; // Uncomment this if you plan to use AWS SNS later

class NotificationService
{
    /**
     * Generic send. For now this only logs the message so you can inspect it in storage/logs/laravel.log.
     * Keep using this anywhere you need a simple notification.
     */
    public static function send(string $to = null, string $subject = 'Notification', string $message = ''): void
    {
        // ✅ Log-friendly format
        Log::info($subject);
        Log::info("To: " . ($to ?? 'N/A'));
        Log::info("Message: " . $message);

        // Optional: Mail::to($to)->send(new ReminderMail(...));

        /*
        // 🔄 SMS (uncomment below to switch to SMS via AWS SNS)

        // $sns = new SnsClient([
        //     'region' => env('AWS_DEFAULT_REGION'),
        //     'version' => '2010-03-31',
        //     'credentials' => [
        //         'key' => env('AWS_ACCESS_KEY_ID'),
        //         'secret' => env('AWS_SECRET_ACCESS_KEY'),
        //     ],
        // ]);

        // try {
        //     $sns->publish([
        //         'Message' => $message,
        //         'PhoneNumber' => $to, // Must be E.164 format, e.g., +639171234567
        //     ]);
        //     Log::info("SMS sent to $to");
        // } catch (\Exception $e) {
        //     Log::error("Failed to send SMS to $to: " . $e->getMessage());
        // }
        */
    }

    /**
     * Build a default reminder message that ALWAYS includes the appointment reference code.
     * If $edited is true and $custom is a non-empty string, the custom message is used.
     */
    public static function buildAppointmentReminderMessage(Appointment $appointment, ?string $custom = null, bool $edited = false): string
    {
        $userName   = optional(optional($appointment->patient)->user)->name ?? 'Patient';
        $service    = optional($appointment->service)->name ?? 'your service';
        $date       = (string) $appointment->date;
        $timeSlot   = (string) $appointment->time_slot;
        $refCode    = (string) ($appointment->reference_code ?? 'N/A');

        $default = "Hello {$userName}, this is a reminder for your dental appointment on {$date} at {$timeSlot} for {$service}. Ref: {$refCode}. Please arrive on time. – Pitogo's Dental Clinic";

        if ($edited && is_string($custom) && trim($custom) !== '') {
            return $custom;
        }

        return $default;
    }

    /**
     * Convenience helper: send a reminder for an appointment.
     * - Ensures the message includes the reference code (unless an edited custom message is provided).
     * - Logs to laravel.log (no real SMS).
     * Returns true if a message was "sent" (logged), false if there was no recipient.
     */
    public static function sendAppointmentReminder(Appointment $appointment, ?string $custom = null, bool $edited = false): bool
    {
        $user   = optional($appointment->patient)->user;
        $to     = $user->contact_number ?? null;

        if (!$to) {
            Log::warning('Reminder not sent: missing contact number', [
                'appointment_id' => $appointment->id,
                'reference_code' => $appointment->reference_code,
            ]);
            return false;
        }

        $message = self::buildAppointmentReminderMessage($appointment, $custom, $edited);

        // For now, just log it (keeps AWS SNS commented out)
        self::send($to, 'Dental Appointment Reminder', $message);

        // Optional structured log line (handy for searching in logs)
        Log::info('Reminder logged (simulated SMS)', [
            'appointment_id' => $appointment->id,
            'reference_code' => $appointment->reference_code,
            'to'             => $to,
            'edited'         => $edited,
        ]);

        return true;
    }
}
