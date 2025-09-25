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
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('category')->nullable(); // e.g., Preventive, Surgical
            $table->boolean('is_excluded_from_analytics')->default(false);
            $table->boolean('is_special')->default(false);
            $table->date('special_start_date')->nullable();
            $table->date('special_end_date')->nullable();
            $table->integer('estimated_minutes');

            // 🔹 new column
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('is_active'); // 🔹 index is valid now
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
