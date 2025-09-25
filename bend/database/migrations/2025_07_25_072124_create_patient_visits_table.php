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
        Schema::create('patient_visits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('service_id')->nullable()->constrained()->onDelete('cascade');

            $table->date('visit_date');
            $table->timestamp('start_time')->nullable(); // recorded upon visit creation
            $table->timestamp('end_time')->nullable();   // recorded on completion or rejection

            $table->enum('status', ['pending', 'completed', 'rejected'])->default('pending');

            $table->text('note')->nullable(); // optional: reason for rejection or notes

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_visits');
    }
};
