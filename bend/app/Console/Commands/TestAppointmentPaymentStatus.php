<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\PatientVisit;
use App\Models\Payment;
use Illuminate\Console\Command;

class TestAppointmentPaymentStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:appointment-payment-status {--appointment-id=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test appointment payment status updates';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $appointmentId = $this->option('appointment-id');
        
        if ($appointmentId) {
            $appointment = Appointment::with(['payments', 'service'])->find($appointmentId);
            if (!$appointment) {
                $this->error("Appointment with ID {$appointmentId} not found.");
                return self::FAILURE;
            }
            $this->testAppointment($appointment);
        } else {
            // Test all appointments with payments
            $appointments = Appointment::with(['payments', 'service'])
                ->whereHas('payments')
                ->get();
            
            if ($appointments->isEmpty()) {
                $this->info('No appointments with payments found.');
                return self::SUCCESS;
            }
            
            $this->info("Testing payment status for {$appointments->count()} appointments...");
            
            foreach ($appointments as $appointment) {
                $this->testAppointment($appointment);
            }
        }
        
        return self::SUCCESS;
    }
    
    private function testAppointment(Appointment $appointment): void
    {
        $totalPaid = $appointment->payments->sum('amount_paid');
        $servicePrice = $appointment->service?->price ?? 0;
        
        $this->line("Appointment ID: {$appointment->id}");
        $this->line("  Patient ID: {$appointment->patient_id}");
        $this->line("  Service: {$appointment->service?->name}");
        $this->line("  Service Price: ₱{$servicePrice}");
        $this->line("  Total Paid: ₱{$totalPaid}");
        $this->line("  Current Payment Status: {$appointment->payment_status}");
        $this->line("  Payment Method: {$appointment->payment_method}");
        $this->line("  Status: {$appointment->status}");
        $this->line("  Payments Count: {$appointment->payments->count()}");
        
        // Check if payment status should be updated
        $expectedStatus = 'unpaid';
        if ($totalPaid >= $servicePrice) {
            $expectedStatus = 'paid';
        } elseif ($totalPaid > 0) {
            $expectedStatus = 'paid';
        } elseif ($appointment->payment_method === 'maya' && $appointment->status === 'approved') {
            $expectedStatus = 'awaiting_payment';
        }
        
        if ($appointment->payment_status !== $expectedStatus) {
            $this->warn("  ⚠️  Payment status mismatch! Expected: {$expectedStatus}, Actual: {$appointment->payment_status}");
            
            // Offer to fix it
            if ($this->confirm("Would you like to update the payment status to '{$expectedStatus}'?")) {
                $appointment->update(['payment_status' => $expectedStatus]);
                $this->info("  ✅ Payment status updated to '{$expectedStatus}'");
            }
        } else {
            $this->info("  ✅ Payment status is correct");
        }
        
        $this->line('');
    }
}
