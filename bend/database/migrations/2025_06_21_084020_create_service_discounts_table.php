<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('service_discounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->onDelete('cascade');

            $table->date('start_date');
            $table->date('end_date');

            // keep precision consistent with services if you want (10,2); 8,2 is also OK
            $table->decimal('discounted_price', 10, 2);

            $table->enum('status', ['planned', 'launched', 'canceled', 'done'])->default('planned');
            $table->timestamp('activated_at')->nullable();
            $table->boolean('is_analytics_linked')->default(false);

            $table->timestamps();

            // indexes that actually exist / are useful
            $table->index(['start_date', 'end_date']);
            $table->index('status');
            $table->index('service_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_discounts');
    }
};
