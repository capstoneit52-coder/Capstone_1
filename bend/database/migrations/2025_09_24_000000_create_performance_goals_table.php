<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performance_goals', function (Blueprint $table) {
            $table->id();
            $table->string('period_type'); // e.g., month, week
            $table->date('period_start');
            $table->string('metric'); // e.g., total_visits
            $table->unsignedBigInteger('target_value');
            $table->string('status')->default('active'); // active, done, missed, cancelled
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['period_type', 'period_start', 'metric'], 'uniq_goal_period_metric');
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_goals');
    }
};

