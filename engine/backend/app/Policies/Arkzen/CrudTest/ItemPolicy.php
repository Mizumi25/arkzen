<?php

// ============================================================
// ARKZEN GENERATED POLICY — ItemPolicy
// Tatemono: crud-test
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-15T15:38:22.103845Z
// ============================================================

namespace App\Policies\Arkzen\CrudTest;

use App\Models\User;
use App\Models\Arkzen\CrudTest\Item;
use Illuminate\Auth\Access\HandlesAuthorization;

class ItemPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool { return true; }

    public function view(User $user, Item $item): bool { return true; }

    public function create(User $user): bool { return true; }

    public function update(User $user, Item $item): bool
    {
        return false || $user->role === 'admin';
    }

    public function delete(User $user, Item $item): bool
    {
        return false || $user->role === 'admin';
    }
}
