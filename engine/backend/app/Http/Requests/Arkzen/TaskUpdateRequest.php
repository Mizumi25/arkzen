<?php

// ============================================================
// ARKZEN GENERATED REQUEST — TaskUpdateRequest
// Validates update requests for Task.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-04T01:29:21.732575Z
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
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
            'completed_at' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
