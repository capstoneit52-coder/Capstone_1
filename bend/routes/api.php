<?php

use Illuminate\Http\Request;
use App\Http\Middleware\AdminOnly;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\MayaController;

use App\Http\Controllers\API\PatientController;
use App\Http\Controllers\API\ServiceController;
use App\Http\Middleware\EnsureDeviceIsApproved;
use App\Http\Controllers\DeviceStatusController;

use App\Http\Controllers\API\InventoryController;
use App\Http\Controllers\API\PatientHmoController;

use App\Http\Controllers\API\AppointmentController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\API\InventoryItemController;
use App\Http\Controllers\Admin\StaffAccountController;
use App\Http\Controllers\API\ClinicCalendarController;
use App\Http\Controllers\Staff\PatientVisitController;
use App\Http\Controllers\API\AppointmentSlotController;

use App\Http\Controllers\API\DentistScheduleController;
use App\Http\Controllers\API\ServiceDiscountController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Admin\DeviceApprovalController;
use App\Http\Controllers\API\InventorySettingsController;
use App\Http\Controllers\API\AppointmentServiceController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\API\ClinicWeeklyScheduleController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Admin\SystemLogController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\GoalController;

// ------------------------
// Public auth routes
// ------------------------
Route::post('/register', [RegisteredUserController::class, 'store']);
Route::post('/login', [AuthenticatedSessionController::class, 'store']);
Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);

Route::post('/forgot-password', [PasswordResetLinkController::class, 'store']);
Route::post('/reset-password', [NewPasswordController::class, 'store']);

// ------------------------
// Authenticated user profile
// ------------------------
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    $user = $request->user()->load('patient');

    return response()->json([
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'contact_number' => $user->contact_number,
        'role' => $user->role,
        'patient' => $user->patient,
        'is_linked' => optional($user->patient)->is_linked ?? false,
    ]);
});

// ------------------------
// Admin-only routes
// ------------------------
Route::middleware(['auth:sanctum', AdminOnly::class])->group(function () {
    // Pending device approvals
    Route::get('/admin/pending-devices', [DeviceApprovalController::class, 'index']);
    Route::post('/admin/approve-device', [DeviceApprovalController::class, 'approve']);
    Route::post('/admin/reject-device', [DeviceApprovalController::class, 'reject']);

    // Approved device management
    Route::get('/approved-devices', [DeviceApprovalController::class, 'approvedDevices']);
    Route::put('/rename-device', [DeviceApprovalController::class, 'renameDevice']);
    Route::post('/revoke-device', [DeviceApprovalController::class, 'revokeDevice']);

    // Staff account management
    Route::post('/admin/staff', [StaffAccountController::class, 'store']);

    // Service management
    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{service}', [ServiceController::class, 'update']);
    Route::delete('/services/{service}', [ServiceController::class, 'destroy']);

    // Service discount management
    Route::get('/services/{service}/discounts', [ServiceDiscountController::class, 'index']);
    Route::post('/services/{service}/discounts', [ServiceDiscountController::class, 'store']);
    Route::put('/discounts/{id}', [ServiceDiscountController::class, 'update']);
    Route::post('/discounts/{id}/launch', [ServiceDiscountController::class, 'launch']);
    Route::post('/discounts/{id}/cancel', [ServiceDiscountController::class, 'cancel']);
    Route::get('/discounts-overview', [ServiceDiscountController::class, 'allActivePromos']);
    Route::get('/discounts-archive', [ServiceDiscountController::class, 'archive']);

    // Clinic calendar management
    Route::prefix('clinic-calendar')->group(function () {
        Route::get('/', [ClinicCalendarController::class, 'index']);
        Route::post('/', [ClinicCalendarController::class, 'store']);

        // ID-based CRUD (numeric)
        Route::put('/{id}', [ClinicCalendarController::class, 'update'])->whereNumber('id');
        Route::delete('/{id}', [ClinicCalendarController::class, 'destroy'])->whereNumber('id');

        // Capacity window + per-day upsert
        Route::get('/daily', [ClinicCalendarController::class, 'daily']);
        Route::put('/day/{date}', [ClinicCalendarController::class, 'upsertDay'])
            ->where('date', '\d{4}-\d{2}-\d{2}');

        Route::put('/{date}/closure', [ClinicCalendarController::class, 'setClosure']);
    });


    // Weekly schedule
    Route::get('/weekly-schedule', [ClinicWeeklyScheduleController::class, 'index']);
    Route::patch('/weekly-schedule/{id}', [ClinicWeeklyScheduleController::class, 'update']);

    // Dentist schedules (capacity source) — keep simple paths
    Route::get('/dentists', [DentistScheduleController::class, 'index']);
    Route::post('/dentists', [DentistScheduleController::class, 'store']);
    Route::get('/dentists/{id}', [DentistScheduleController::class, 'show']);
    Route::put('/dentists/{id}', [DentistScheduleController::class, 'update']);
    Route::delete('/dentists/{id}', [DentistScheduleController::class, 'destroy']);

    //inventory
    Route::post('/inventory/adjust', [InventoryController::class, 'adjust']);
    Route::patch('/inventory/settings', [InventorySettingsController::class, 'update']);

    // System logs
    Route::prefix('system-logs')->group(function () {
        Route::get('/', [SystemLogController::class, 'index']);
        Route::get('/filter-options', [SystemLogController::class, 'filterOptions']);
        Route::get('/statistics', [SystemLogController::class, 'statistics']);
        Route::get('/{systemLog}', [SystemLogController::class, 'show']);
    });

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/visits-monthly', [ReportController::class, 'visitsMonthly']);
    });

    // Analytics summary
    Route::get('/analytics/summary', [ReportController::class, 'analyticsSummary']);

    // Performance goals
    Route::prefix('goals')->group(function () {
        Route::post('/', [GoalController::class, 'store']);
        Route::get('/', [GoalController::class, 'index']);
        Route::get('/{id}/progress', [GoalController::class, 'progress'])->whereNumber('id');
    });
});

// ------------------------
// Authenticated routes (any logged-in user)
// ------------------------
Route::middleware('auth:sanctum')->group(function () {
    // Staff device status
    Route::get('/device-status', [DeviceStatusController::class, 'check']);
    Route::post('/staff/change-password', [\App\Http\Controllers\Staff\StaffAccountController::class, 'changePassword']);

    // Clinic calendar resolve
    Route::get('/clinic-calendar/resolve', [ClinicCalendarController::class, 'resolve']);
    Route::get('/clinic-calendar/alerts', [ClinicCalendarController::class, 'upcomingClosures']);
    Route::get('/me/closure-impacts', [ClinicCalendarController::class, 'myClosureImpacts']);

    // Appointment (patient side)
    Route::prefix('appointment')->group(function () {
        Route::get('/available-services', [AppointmentServiceController::class, 'availableServices']);
        Route::post('/', [AppointmentController::class, 'store']);
        Route::get('/available-slots', [AppointmentSlotController::class, 'get']);
        Route::post('/{id}/cancel', [AppointmentController::class, 'cancel']);
        Route::get('/resolve/{code}', [AppointmentController::class, 'resolveReferenceCode']);
    });

    // HMO verification and notification by staff/admin (per appointment)
    Route::post('/appointments/{id}/hmo/reveal', [AppointmentController::class, 'revealHmo']);
    Route::post('/appointments/{id}/hmo/notify', [AppointmentController::class, 'notifyHmoCoverage']);

    Route::get('/patients', [PatientController::class, 'index']);

    // Patient linking
    Route::post('/patients/link-self', [PatientController::class, 'linkSelf']);

    // Patient's own appointments
    Route::get('/user-appointments', [AppointmentController::class, 'userAppointments']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::get('/notifications/mine', [NotificationController::class, 'mine'])->middleware('throttle:30,1');

    Route::prefix('inventory')->group(function () {

        Route::get('/items', [InventoryItemController::class, 'index']);
        Route::post('/items', [InventoryItemController::class, 'store']);

        Route::post('/receive', [InventoryController::class, 'receive']);
        Route::post('/consume', [InventoryController::class, 'consume']);

        Route::get('/settings', [InventorySettingsController::class, 'show']);

        Route::put('/items/{item}', [InventoryItemController::class, 'update']);
        Route::delete('/items/{item}', [InventoryItemController::class, 'destroy']);
        Route::get('/items/{item}/batches', [InventoryController::class, 'batches']);
        Route::get('/suppliers', [InventoryController::class, 'suppliers']);
        Route::post('/suppliers', [InventoryController::class, 'storeSupplier']);
    });

    // Create payment (user must be logged in)
    Route::post('/maya/payments', [MayaController::class, 'createPayment']);

    // If you prefer status behind auth, keep it here instead of public:
    Route::get('/maya/payments/{paymentId}/status', [MayaController::class, 'status']);

    // HMO
    Route::get('/patients/{patient}/hmos', [PatientHmoController::class, 'index'])->name('hmos.index');
    Route::post('/patients/{patient}/hmos', [PatientHmoController::class, 'store'])->name('hmos.store');
    Route::put('/patients/{patient}/hmos/{hmo}', [PatientHmoController::class, 'update'])->name('hmos.update');
    Route::delete('/patients/{patient}/hmos/{hmo}', [PatientHmoController::class, 'destroy'])->name('hmos.destroy');
});

// ------------------------
// Staff routes (only if device is approved)
// ------------------------
Route::middleware(['auth:sanctum', EnsureDeviceIsApproved::class])->group(function () {
    // Patients

    Route::post('/patients', [PatientController::class, 'store']);
    Route::post('/patients/{patient}/link', [PatientController::class, 'linkToUser']);
    Route::post('/patients/{id}/flag', [PatientController::class, 'flagReview']);
    Route::get('/patients/search', [PatientController::class, 'search']);

    // Visits
    Route::prefix('visits')->group(function () {
        Route::get('/', [PatientVisitController::class, 'index']);
        Route::post('/', [PatientVisitController::class, 'store']);
        Route::post('/{id}/finish', [PatientVisitController::class, 'finish']);
        Route::post('/{id}/complete-with-details', [PatientVisitController::class, 'completeWithDetails']);
        Route::post('/{id}/reject', [PatientVisitController::class, 'reject']);
        Route::put('/{id}/update-patient', [PatientVisitController::class, 'updatePatient']);
        Route::post('/{visit}/link-existing', [PatientVisitController::class, 'linkToExistingPatient']);
        Route::post('/{id}/view-notes', [PatientVisitController::class, 'viewNotes']);
    });

    // Appointments (staff side)
    Route::post('/appointments/{id}/approve', [AppointmentController::class, 'approve']);
    Route::post('/appointments/{id}/reject', [AppointmentController::class, 'reject']);
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/remindable', [AppointmentController::class, 'remindable']);
    Route::post('/appointments/{id}/send-reminder', [AppointmentController::class, 'sendReminder']);
    Route::get('/appointments/resolve-exact', [AppointmentController::class, 'resolveExact']);
});

// ------------------------
// Public service routes (read-only)
// ------------------------
Route::middleware('auth:sanctum')->get('/services', [ServiceController::class, 'index']);
Route::middleware('auth:sanctum')->get('/services/{service}', [ServiceController::class, 'show']);
Route::post('/maya/webhook', [MayaController::class, 'webhook'])
    ->middleware('throttle:120,1');

Route::get('/maya/return/success', [MayaController::class, 'returnCapture'])->defaults('outcome', 'success');
Route::get('/maya/return/failure', [MayaController::class, 'returnCapture'])->defaults('outcome', 'failure');
Route::get('/maya/return/cancel', [MayaController::class, 'returnCapture'])->defaults('outcome', 'cancel');