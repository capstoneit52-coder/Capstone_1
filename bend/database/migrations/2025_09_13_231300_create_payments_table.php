<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Link to either an appointment or a visit (both nullable to allow flexibility)
            $table->foreignId('appointment_id')->nullable()
                ->constrained('appointments')->nullOnDelete();
            $table->foreignId('patient_visit_id')->nullable()
                ->constrained('patient_visits')->nullOnDelete();

            // Core amounts
            $table->string('currency', 3)->default('PHP');
            $table->decimal('amount_due', 12, 2);   // set by backend (source of truth)
            $table->decimal('amount_paid', 12, 2)->default(0); // useful for partials/futures

            // Method & status
            $table->enum('method', ['maya', 'cash', 'hmo'])->default('maya');
            $table->enum('status', ['unpaid', 'awaiting_payment', 'paid', 'cancelled', 'failed'])
                ->default('unpaid');

            // Human-friendly internal reference for audit/tracing (not the Maya one)
            $table->string('reference_no')->unique();

            // Maya checkout/payment identifiers (nullable for non-Maya)
            $table->string('maya_checkout_id')->nullable()->unique();
            $table->string('maya_payment_id')->nullable()->unique();

            // Optional: RRN / auth / trace fields Maya may return
            $table->string('rrn')->nullable();   // retrieval reference number
            $table->string('auth_code')->nullable();

            // Where React redirects the user to pay (from Create Checkout)
            $table->text('redirect_url')->nullable();

            // Timestamps for state changes
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            // Webhook tracking and raw payloads for DOH-style audit
            $table->timestamp('webhook_first_received_at')->nullable();
            $table->json('webhook_last_payload')->nullable();
            $table->json('meta')->nullable(); // any extra context (e.g., IP, UA) safe to store

            // Who initiated the payment (optional; nullable for patient-initiated)
            $table->foreignId('created_by')->nullable()
                ->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Helpful indexes
            $table->index(['status', 'created_at']);
            $table->index(['method', 'status']);
            $table->index(['appointment_id', 'status']);
            $table->index(['patient_visit_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
