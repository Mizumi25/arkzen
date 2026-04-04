<?php

// ============================================================
// ARKZEN GENERATED CONTROLLER — CommentController
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T09:57:12.725721Z
// ============================================================

namespace App\Http\Controllers\Arkzen;

use Illuminate\Routing\Controller;
use App\Models\Arkzen\Comment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CommentController extends Controller
{
    /**
     * Get comments by task
     */
    public function index(Request $request): JsonResponse
    {
        $query = Comment::query();

        if ($request->filled('task_id')) {
            $query->where('task_id', $request->task_id);
        }
        $perPage = $request->get('per_page', 15);
        $results = $query->paginate($perPage);

        return response()->json($results);
    }

    /**
     * Create comment
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task_id' => 'required|exists:tasks,id',
            'content' => 'required|string'
        ]);

        $comment = Comment::create($validated);

        return response()->json($comment, 201);
    }

    /**
     * Delete comment
     */
    public function destroy(Comment $comment): JsonResponse
    {
        $comment->delete();

        return response()->json(['message' => 'Comment deleted']);
    }
}
