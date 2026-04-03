<?php

// ============================================================
// ARKZEN GENERATED REQUEST — ProjectStoreRequest
// Validates store requests for Project.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T07:08:11.786476Z
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class ProjectStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,planning,completed,on_hold',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
