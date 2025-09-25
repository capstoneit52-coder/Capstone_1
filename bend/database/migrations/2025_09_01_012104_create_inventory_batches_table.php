<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();

            $table->foreignId('item_id')
                ->constrained('inventory_items')
                ->cascadeOnDelete();

            // Lot & batch labels (lot required for drugs at app-level validation)
            $table->string('lot_number')->nullable();
            $table->string('batch_number')->nullable();

            // Expiry (nullable for non-drugs/equipment)
            $table->date('expiry_date')->nullable();

            // Quantities (decimals support ml/g/kg/L, etc.)
            $table->decimal('qty_received', 14, 3);
            $table->decimal('qty_on_hand', 14, 3);

            // Costing: FIFO per batch (cost captured here)
            $table->decimal('cost_per_unit', 14, 2)->nullable();

            // Supplier & optional invoice metadata
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('invoice_no')->nullable();
            $table->date('invoice_date')->nullable();

            // Receiving audit
            $table->dateTime('received_at')->useCurrent();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();

            // Optional note about how this batch is packed (UI hint only)
            $table->string('pack_size')->nullable();

            $table->timestamps();

            // Query helpers
            $table->index(['item_id', 'expiry_date', 'received_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');
    }
};
