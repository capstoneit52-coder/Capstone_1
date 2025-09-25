<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Simple per-request cache (cleared on write).
     * Note: this is NOT a cross-request cache. Use config/cache if you need that.
     */
    protected static array $cache = [];

    /* ============================================================
     | Core getters/setters
     * ============================================================*/

    public static function get(string $key, $default = null)
    {
        if (array_key_exists($key, static::$cache)) {
            return static::$cache[$key];
        }

        $val = static::query()->where('key', $key)->value('value');

        // Normalize common boolean string values
        if ($val === null) {
            $val = $default;
        } elseif ($val === 'true') {
            $val = true;
        } elseif ($val === 'false') {
            $val = false;
        }

        return static::$cache[$key] = $val;
    }

    public static function set(string $key, $value): self
    {
        // Store booleans as 'true'/'false' strings for consistency
        if (is_bool($value)) {
            $value = $value ? 'true' : 'false';
        }

        $row = static::updateOrCreate(['key' => $key], ['value' => $value]);

        // keep per-request cache coherent
        static::$cache[$key] = $value;

        return $row;
    }

    public static function forget(string $key): void
    {
        unset(static::$cache[$key]);
    }

    /* ============================================================
     | Typed helpers
     * ============================================================*/

    public static function getBool(string $key, bool $default = false): bool
    {
        $val = static::get($key, $default);
        if (is_bool($val)) return $val;

        // Accept common truthy/falsey strings/numbers
        $s = is_string($val) ? strtolower($val) : $val;
        return in_array($s, [true, 1, '1', 'true', 'yes', 'on'], true);
    }

    public static function getInt(string $key, int $default = 0): int
    {
        $val = static::get($key, $default);
        return (int) $val;
    }

    public static function getJson(string $key, array $default = []): array
    {
        $val = static::get($key);
        if ($val === null || $val === '') return $default;

        if (is_array($val)) return $val; // already decoded by caller
        if (is_string($val)) {
            $decoded = json_decode($val, true);
            return json_last_error() === JSON_ERROR_NONE ? ($decoded ?? $default) : $default;
        }
        return $default;
    }

    /* ============================================================
     | Convenience flags for inventory
     * ============================================================*/

    public static function staffCanReceive(): bool
    {
        return static::getBool('inventory.staff_can_receive', false);
    }

    public static function nearExpiryDays(): int
    {
        return static::getInt('inventory.near_expiry_days', 30);
    }

    public static function lowStockDebounceHours(): int
    {
        return static::getInt('inventory.low_stock_debounce_hours', 24);
    }

    /* ============================================================
     | Bulk helpers (optional)
     * ============================================================*/

    /** Return key=>value for all settings starting with a prefix (e.g., 'inventory.'). */
    public static function allWithPrefix(string $prefix): array
    {
        $rows = static::query()
            ->where('key', 'like', $prefix . '%')
            ->pluck('value', 'key')
            ->all();

        // normalize booleans for convenience
        foreach ($rows as $k => $v) {
            if ($v === 'true')  $rows[$k] = true;
            if ($v === 'false') $rows[$k] = false;
            static::$cache[$k] = $rows[$k];
        }
        return $rows;
    }
}
