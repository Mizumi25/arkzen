<?php

// ============================================================
// ARKZEN GENERATED REQUEST — TaskStoreRequest
// Validates store requests for Task.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-04T01:29:21.731680Z
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class TaskStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
