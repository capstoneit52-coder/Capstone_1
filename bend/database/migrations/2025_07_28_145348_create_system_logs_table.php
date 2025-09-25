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
        Schema::create('system_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // actor
            $table->string('category');     // e.g. 'appointment', 'dentist', 'device'
            $table->string('action');       // e.g. 'approved', 'rejected', 'canceled_by_patient'
            $table->unsignedBigInteger('subject_id')->nullable(); // e.g. appointment_id, dentist_id
            $table->text('message');
            $table->json('context')->nullable();
            $table->timestamps();

            // indexes for your common lookups
            $table->index(['user_id', 'created_at']);                 // by actor over time
            $table->index(['category', 'subject_id', 'created_at']);  // by entity over time
            $table->index(['category', 'action', 'created_at']);      // dashboards by action
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_logs');
    }
};
