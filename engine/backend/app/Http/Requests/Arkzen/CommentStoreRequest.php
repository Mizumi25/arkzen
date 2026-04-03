<?php

// ============================================================
// ARKZEN GENERATED REQUEST — CommentStoreRequest
// Validates store requests for Comment.
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T07:08:11.790168Z
// ============================================================

namespace App\Http\Requests\Arkzen;

use Illuminate\Foundation\Http\FormRequest;

class CommentStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'task_id' => 'required|exists:tasks,id',
            'content' => 'required|string',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
