<?php

// ============================================================
// ARKZEN GENERATED RESOURCE — CampaignResource
// Tatemono: only-funds
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-12T04:27:33.840923Z
// ============================================================

namespace App\Http\Resources\Arkzen\OnlyFunds;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'goal_amount' => $this->goal_amount,
            'current_amount' => $this->current_amount,
            'image_url' => $this->image_url,
            'status' => $this->status,
            'end_date' => $this->end_date,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
