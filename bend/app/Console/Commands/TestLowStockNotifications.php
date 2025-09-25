<?php

namespace App\Console\Commands;

use App\Models\InventoryItem;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class TestLowStockNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inventory:test-low-stock {--item-id=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test low stock notifications for inventory items';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $itemId = $this->option('item-id');
        
        if ($itemId) {
            $item = InventoryItem::find($itemId);
            if (!$item) {
                $this->error("Item with ID {$itemId} not found.");
                return self::FAILURE;
            }
            $this->testItem($item);
        } else {
            // Test all items with low stock thresholds
            $items = InventoryItem::where('low_stock_threshold', '>', 0)->get();
            
            if ($items->isEmpty()) {
                $this->info('No items with low stock thresholds found.');
                return self::SUCCESS;
            }
            
            $this->info("Testing low stock notifications for {$items->count()} items...");
            
            foreach ($items as $item) {
                $this->testItem($item);
            }
        }
        
        return self::SUCCESS;
    }
    
    private function testItem(InventoryItem $item): void
    {
        $totalOnHand = (float) $item->batches()->sum('qty_on_hand');
        $threshold = (float) $item->low_stock_threshold;
        
        $this->line("Item: {$item->name} (ID: {$item->id})");
        $this->line("  On-hand: {$totalOnHand} {$item->unit}");
        $this->line("  Threshold: {$threshold} {$item->unit}");
        
        if ($totalOnHand <= $threshold) {
            $this->warn("  ⚠️  LOW STOCK - Should trigger notification");
            
            // Test notification
            $notification = NotificationService::notifyLowStock($item, $totalOnHand);
            if ($notification) {
                $this->info("  ✅ Notification created successfully (ID: {$notification->id})");
            } else {
                $this->error("  ❌ Notification creation failed (likely debounced)");
            }
        } else {
            $this->info("  ✅ Stock level is above threshold");
        }
        
        $this->line('');
    }
}
