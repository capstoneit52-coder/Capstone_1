<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('clinic_calendar', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique(); // one record per day

            // Clinic open/close (overrides + holidays live here)
            $table->boolean('is_open')->default(true);
            $table->time('open_time')->nullable();
            $table->time('close_time')->nullable();

            // Legacy/optional (not used by resolver for capacity, kept for compatibility)
            $table->unsignedTinyInteger('dentist_count')->default(1);

            // Capacity cap written by Capacity Planner (null means "no cap")
            $table->unsignedTinyInteger('max_per_block_override')
                ->nullable()
                ->comment('Optional per-date cap for concurrent appointments');

            // Show in Overrides list or hide (system‑generated)?
            $table->boolean('is_generated')->default(false)
                ->comment('true = system-generated (Capacity); false = human override (e.g., holiday)');

            $table->string('note')->nullable();

            $table->timestamps();
        });
    }



    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_calendar');
    }
};
