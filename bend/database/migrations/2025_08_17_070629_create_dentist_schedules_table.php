<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dentist_schedules', function (Blueprint $table) {
            $table->id();
        
            $table->string('dentist_name');                 // e.g., "Dr. Jane D." or alias
            $table->boolean('is_pseudonymous')->default(false);
        
            $table->enum('employment_type', ['full_time','part_time'])->default('part_time');
            $table->date('contract_end_date')->nullable();
            $table->enum('status', ['active','inactive'])->default('active');
            $table->string('dentist_code')->unique()->comment('Stable anonymized identifier, e.g. D-001');
            
            // Days (Sun..Sat)
            $table->boolean('sun')->default(false)->index();
            $table->boolean('mon')->default(false)->index();
            $table->boolean('tue')->default(false)->index();
            $table->boolean('wed')->default(false)->index();
            $table->boolean('thu')->default(false)->index();
            $table->boolean('fri')->default(false)->index();
            $table->boolean('sat')->default(false)->index();
        
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dentist_schedules');
    }
};