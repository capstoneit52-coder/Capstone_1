<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('staff_device', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('device_fingerprint'); // user-agent + IP or hashed string
            $table->string('device_name')->nullable(); // Admin-labeled name (e.g., "Front Desk PC")
            $table->boolean('is_approved')->default(false);
            $table->string('temporary_code')->nullable(); // Code shown during approval
            $table->timestamps();

            $table->unique(['user_id', 'device_fingerprint']); // Avoid duplicates
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_device');
    }
};
