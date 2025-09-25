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
        Schema::create('notification_targets', function (Blueprint $t) {
            $t->id();
            $t->foreignId('notification_id')->constrained('notifications')->cascadeOnDelete();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->timestamp('seen_at')->nullable();
            $t->timestamp('read_at')->nullable();
            $t->timestamps();

            $t->index(['user_id', 'read_at']);  
            $t->unique(['notification_id','user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_targets');
    }
};
