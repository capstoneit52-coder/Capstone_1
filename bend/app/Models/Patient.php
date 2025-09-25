<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'middle_name',
        'birthdate',
        'sex',
        'contact_number',
        'address',
        'is_linked',
        'flag_manual_review',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function byUser($userId)
    {
        return self::where('user_id', $userId)
            ->where('is_linked', true)
            ->first();
    }


}
