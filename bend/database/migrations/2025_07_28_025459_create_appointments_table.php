<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('service_id')->constrained()->onDelete('cascade');

            // 🔹 NEW: link chosen HMO if applicable
            $table->foreignId('patient_hmo_id')
                ->nullable()
                ->constrained('patient_hmos')
                ->nullOnDelete();

            // booking fields
            $table->date('date');                // was "scheduled_date" in some older drafts
            $table->string('time_slot');         // e.g., "08:00-09:00"
            $table->string('reference_code')->unique()->nullable();

            // states
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled', 'completed'])
                  ->default('pending');
            $table->enum('payment_method', ['cash', 'maya', 'hmo'])
                  ->default('cash');
            $table->enum('payment_status', ['unpaid', 'awaiting_payment', 'paid'])
                  ->default('unpaid');

            // misc
            $table->text('notes')->nullable();
            $table->timestamp('canceled_at')->nullable();
            $table->timestamp('reminded_at')->nullable();

            $table->timestamps();

            // ✅ indexes
            $table->index(['patient_id', 'status', 'date']);
            $table->index(['date', 'status']);
            $table->index('reference_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
