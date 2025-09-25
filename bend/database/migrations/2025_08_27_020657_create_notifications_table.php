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
        Schema::create('notifications', function (Blueprint $t) {
            $t->id();
            $t->string('type'); // closure, low_stock, system
            $t->string('title');
            $t->text('body')->nullable();
            $t->enum('severity', ['info', 'warning', 'danger'])->default('info');

            // audience & timing
            $t->enum('scope', ['targeted', 'broadcast'])->default('targeted');
            $t->json('audience_roles')->nullable(); // e.g. ["patient","staff","admin"] for broadcast
            $t->timestamp('effective_from')->nullable();
            $t->timestamp('effective_until')->nullable();

            $t->json('data')->nullable(); // {"date":"2025-09-01", ...}
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();

            $t->index(['scope', 'effective_from']);
            $t->index(['scope', 'effective_until']);
            $t->index('created_at');
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
