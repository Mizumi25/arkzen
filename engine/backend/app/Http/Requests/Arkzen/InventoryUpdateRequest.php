<?php

// ============================================================
// ARKZEN GENERATED REQUEST — InventoryUpdateRequest
// Validates update requests for Inventory.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T07:08:12.187549Z
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class InventoryUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'quantity' => 'sometimes|integer|min:0',
            'price' => 'sometimes|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
