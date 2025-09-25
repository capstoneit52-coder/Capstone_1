<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        User::truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            [
                'name' => 'Frontdesk Staff',
                'email' => 'staff@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'staff',
            ],
            [
                'name' => 'Juan Patient',
                'email' => 'juan.patient@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'patient',
            ],
            [
                'name' => 'Maria Patient',
                'email' => 'maria.patient@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'patient',
            ],
        ];

        foreach ($users as $user) {
            User::create($user);
        }
    }
}
