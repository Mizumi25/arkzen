<?php

// ============================================================
// ARKZEN GENERATED POLICY — DonationPolicy
// Tatemono: only-funds
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-11T01:31:19.858812Z
// ============================================================

namespace App\Policies\Arkzen\OnlyFunds;

use App\Models\User;
use App\Models\Arkzen\OnlyFunds\Donation;
use Illuminate\Auth\Access\HandlesAuthorization;

class DonationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool { return true; }

    public function view(User $user, Donation $donation): bool { return true; }

    public function create(User $user): bool { return true; }

    public function update(User $user, Donation $donation): bool
    {
        return $user->id === $donation->user_id || $user->role === 'admin';
    }

    public function delete(User $user, Donation $donation): bool
    {
        return $user->id === $donation->user_id || $user->role === 'admin';
    }
}
