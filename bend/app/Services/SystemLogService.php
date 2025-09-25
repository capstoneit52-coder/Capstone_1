<?php

namespace App\Services;

use App\Models\SystemLog;
use Illuminate\Support\Facades\Auth;

class SystemLogService
{
    /**
     * Log a system event
     */
    public static function log(string $category, string $action, ?int $subjectId = null, string $message = '', array $context = [])
    {
        return SystemLog::create([
            'user_id' => Auth::id(),
            'category' => $category,
            'action' => $action,
            'subject_id' => $subjectId,
            'message' => $message,
            'context' => $context,
        ]);
    }

    /**
     * Log user-related events
     */
    public static function logUser(string $action, ?int $userId = null, string $message = '', array $context = [])
    {
        return self::log('user', $action, $userId, $message, $context);
    }

    /**
     * Log appointment-related events
     */
    public static function logAppointment(string $action, ?int $appointmentId = null, string $message = '', array $context = [])
    {
        return self::log('appointment', $action, $appointmentId, $message, $context);
    }

    /**
     * Log device-related events
     */
    public static function logDevice(string $action, ?int $deviceId = null, string $message = '', array $context = [])
    {
        return self::log('device', $action, $deviceId, $message, $context);
    }

    /**
     * Log inventory-related events
     */
    public static function logInventory(string $action, ?int $itemId = null, string $message = '', array $context = [])
    {
        return self::log('inventory', $action, $itemId, $message, $context);
    }

    /**
     * Log payment-related events
     */
    public static function logPayment(string $action, ?int $paymentId = null, string $message = '', array $context = [])
    {
        return self::log('payment', $action, $paymentId, $message, $context);
    }

    /**
     * Log system-related events
     */
    public static function logSystem(string $action, string $message = '', array $context = [])
    {
        return self::log('system', $action, null, $message, $context);
    }
}
