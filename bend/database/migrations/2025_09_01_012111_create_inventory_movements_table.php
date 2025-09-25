<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('item_id')
                ->constrained('inventory_items')
                ->cascadeOnDelete();

            // Usually present; nullable for legacy or admin-side adjust without specific batch
            $table->foreignId('batch_id')
                ->nullable()
                ->constrained('inventory_batches')
                ->nullOnDelete();

            // Ledger types
            $table->enum('type', ['receive', 'consume', 'adjust']);

            // Always positive; sign is implied by type
            $table->decimal('quantity', 14, 3);

            // Adjustment reason (required only when type = adjust)
            $table->enum('adjust_reason', [
                'damaged',
                'expired',
                'count_correction',
                'return_to_supplier',
                'stock_take_variance',
                'theft',
                'other'
            ])->nullable();

            // Optional linkage (e.g., to appointments or visits)
            $table->string('ref_type')->nullable();      // e.g., 'appointment', 'visit'
            $table->unsignedBigInteger('ref_id')->nullable();

            // Snapshot of unit cost at the time (optional; useful for reporting)
            $table->decimal('cost_at_time', 14, 2)->nullable();

            // Who performed it
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();

            // Reporting/analytics helpers
            $table->index(['type', 'created_at']);
            $table->index(['item_id', 'type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
