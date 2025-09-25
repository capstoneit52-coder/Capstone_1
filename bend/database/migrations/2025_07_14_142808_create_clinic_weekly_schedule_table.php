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
        Schema::create('clinic_weekly_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('weekday')->comment('0 = Sunday, 6 = Saturday');
            $table->boolean('is_open')->default(false);
            $table->time('open_time')->nullable();
            $table->time('close_time')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique('weekday'); // one row per weekday
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_weekly_schedules');
    }
};
