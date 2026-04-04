<?php

// ============================================================
// ARKZEN GENERATED REQUEST — InventoryStoreRequest
// Validates store requests for Inventory.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-04T03:26:57.360395Z
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class InventoryStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'sku' => 'required|string|unique:inventories',
            'quantity' => 'required|integer|min:0',
            'price' => 'required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'description' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
