<?php

// ============================================================
// ARKZEN GENERATED REQUEST — ProjectUpdateRequest
// Validates update requests for Project.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T04:50:36.254217Z
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class ProjectUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:active,planning,completed,on_hold',
            'progress' => 'sometimes|integer|min:0|max:100',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
