<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;

class InventorySettingsController extends Controller
{
    // GET /api/inventory/settings
    public function show()
    {
        return response()->json([
            'staff_can_receive'         => AppSetting::getBool('inventory.staff_can_receive', false),
            'near_expiry_days'          => AppSetting::getInt('inventory.near_expiry_days', 30),
            'low_stock_debounce_hours'  => AppSetting::getInt('inventory.low_stock_debounce_hours', 24),
        ]);
    }

    // PATCH /api/inventory/settings  (admin only)
    public function update(Request $request)
    {
        $data = $request->validate([
            'staff_can_receive'        => 'sometimes|boolean',
            'near_expiry_days'         => 'sometimes|integer|min:1|max:365',
            'low_stock_debounce_hours' => 'sometimes|integer|min:1|max:168',
        ]);

        if (array_key_exists('staff_can_receive', $data)) {
            AppSetting::set('inventory.staff_can_receive', (bool) $data['staff_can_receive']);
        }
        if (array_key_exists('near_expiry_days', $data)) {
            AppSetting::set('inventory.near_expiry_days', (int) $data['near_expiry_days']);
        }
        if (array_key_exists('low_stock_debounce_hours', $data)) {
            AppSetting::set('inventory.low_stock_debounce_hours', (int) $data['low_stock_debounce_hours']);
        }

        return $this->show();
    }
}
