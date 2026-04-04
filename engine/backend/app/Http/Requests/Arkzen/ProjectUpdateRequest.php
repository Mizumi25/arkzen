<?php

// ============================================================
// ARKZEN GENERATED REQUEST — ProjectUpdateRequest
// Validates update requests for Project.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-04T01:29:21.730624Z
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
            'priority' => 'sometimes|in:low,medium,high,urgent',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
