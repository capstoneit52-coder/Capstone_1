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
        Schema::create('patient_hmos', function (Blueprint $table) {
            $table->id();

            // Who owns this HMO record
            $table->unsignedBigInteger('patient_id')->index();

            // Required: HMO provider name (patient-typed)
            $table->string('provider_name');

            // Optional details (kept minimal; encrypted via casts in Model)
            $table->text('member_id_encrypted')->nullable();
            $table->text('policy_no_encrypted')->nullable();

            // Optional validity range
            $table->date('effective_date')->nullable();
            $table->date('expiry_date')->nullable();

            // Mark one as primary if patient stores multiple later
            $table->boolean('is_primary')->default(false);

            // Free-form internal notes (e.g., “presented physical card at front desk”)
            $table->text('notes_encrypted')->nullable();

            // Audit: who encoded/edited last (users.id); nullable to allow system actions
            $table->unsignedBigInteger('author_id')->nullable()->index();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
            $table->foreign('author_id')->references('id')->on('users')->nullOnDelete();

            // A patient may have multiple HMOs; allow multiple provider names.
            // But keep (patient_id, provider_name, member_id_encrypted) unique-ish if you prefer:
            // $table->unique(['patient_id','provider_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_hmos');
    }
};
