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
        Schema::create('service_bundle_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_service_id')->constrained('services')->onDelete('cascade');
            $table->foreignId('child_service_id')->constrained('services')->onDelete('cascade');
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_bundle_items');
    }
};
