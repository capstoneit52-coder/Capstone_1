<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goal_progress_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('goal_id')->constrained('performance_goals')->cascadeOnDelete();
            $table->date('as_of_date');
            $table->unsignedBigInteger('actual_value');
            $table->timestamps();

            $table->unique(['goal_id', 'as_of_date'], 'uniq_goal_date');
            $table->index(['as_of_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goal_progress_snapshots');
    }
};

