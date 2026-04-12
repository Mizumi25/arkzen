<?php

// ============================================================
// ARKZEN GENERATED POLICY — CampaignPolicy
// Tatemono: only-funds
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-12T00:12:06.949712Z
// ============================================================

namespace App\Policies\Arkzen\OnlyFunds;

use App\Models\User;
use App\Models\Arkzen\OnlyFunds\Campaign;
use Illuminate\Auth\Access\HandlesAuthorization;

class CampaignPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool { return true; }

    public function view(User $user, Campaign $campaign): bool { return true; }

    public function create(User $user): bool { return true; }

    public function update(User $user, Campaign $campaign): bool
    {
        return $user->id === $campaign->user_id || $user->role === 'admin';
    }

    public function delete(User $user, Campaign $campaign): bool
    {
        return $user->id === $campaign->user_id || $user->role === 'admin';
    }
}
