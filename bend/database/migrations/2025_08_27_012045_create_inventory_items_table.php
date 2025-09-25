<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            // Unique item identity
            $table->string('sku_code')->unique();

            // Category/type of item
            $table->enum('type', ['drug', 'equipment', 'supply', 'other'])->default('supply');

            // Base unit used across all stock math (e.g., "pcs", "ml", "g")
            $table->string('unit')->default('unit');

            // Threshold for low-stock alert (per item, not per batch)
            $table->unsignedInteger('low_stock_threshold')->default(0);

            // Optional: suggest pack size in UI (e.g., box of 10 → 10.000)
            $table->decimal('default_pack_size', 12, 3)->nullable();

            // For stricter audit trail (e.g., regulated drugs)
            $table->boolean('is_controlled')->default(false);

            // Soft-disable item without deleting for audit
            $table->boolean('is_active')->default(true);

            // Owner/audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // Extra notes (e.g., storage instructions)
            $table->text('notes')->nullable();

            $table->timestamps();

            // Helpful lookup
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
