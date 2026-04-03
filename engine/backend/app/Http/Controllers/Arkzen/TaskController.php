<?php

// ============================================================
// ARKZEN GENERATED CONTROLLER — TaskController
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T07:08:11.793085Z
// ============================================================

namespace App\Http\Controllers\Arkzen;

use Illuminate\Routing\Controller;
use App\Models\Arkzen\Task;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TaskController extends Controller
{
    /**
     * Get tasks by project
     */
    public function index(Request $request): JsonResponse
    {
        $query = Task::query();

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }
        $perPage = $request->get('per_page', 15);
        $results = $query->paginate($perPage);

        return response()->json($results);
    }

    /**
     * Get single task
     */
    public function show(Task $task): JsonResponse
    {
        return response()->json($task);
    }

    /**
     * Create new task
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'due_date' => 'nullable|date'
        ]);

        $task = Task::create($validated);

        return response()->json($task, 201);
    }

    /**
     * Update task
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:todo,in_progress,review,done',
            'completed_at' => 'nullable|date'
        ]);

        $task->update($validated);

        return response()->json($task);
    }

    /**
     * Delete task
     */
    public function destroy(Task $task): JsonResponse
    {
        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }
}
