<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\AppSetting;
use App\Models\InventoryBatch;
use Illuminate\Console\Command;
use App\Services\NotificationService;

class ScanNearExpiry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inventory:scan-near-expiry {--days=30}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Broadcast near-expiry alerts to admins for batches expiring within N days.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // If user passes --days, use it, otherwise fall back to AppSetting
        $days = $this->option('days') !== null
            ? (int) $this->option('days')
            : AppSetting::nearExpiryDays();

        $today = Carbon::today();
        $cutoff = $today->copy()->addDays($days);

        $batches = InventoryBatch::with('item')
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', $today)
            ->whereDate('expiry_date', '<=', $cutoff)
            ->get();

        foreach ($batches as $b) {
            $daysLeft = $today->diffInDays(Carbon::parse($b->expiry_date));
            NotificationService::notifyNearExpiry($b, $daysLeft);
        }

        $this->info("Near-expiry scan complete (window = {$days} days).");
        return self::SUCCESS;
    }
}
