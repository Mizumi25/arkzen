<?php

// ============================================================
// ARKZEN GENERATED REQUEST — TaskUpdateRequest
// Validates update requests for Task.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T06:33:49.162100Z
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class TaskUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:todo,in_progress,review,done',
            'completed_at' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
