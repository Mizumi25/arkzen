<?php

// ============================================================
// ARKZEN GENERATED CONTROLLER — ProjectController
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T07:08:11.792319Z
// ============================================================

namespace App\Http\Controllers\Arkzen;

use Illuminate\Routing\Controller;
use App\Models\Arkzen\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    /**
     * Get paginated projects
     */
    public function index(Request $request): JsonResponse
    {
        $query = Project::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->orWhere('name', 'like', '%' . $request->search . '%');
                $q->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        $perPage = $request->get('per_page', 15);
        $results = $query->paginate($perPage);

        return response()->json($results);
    }

    /**
     * Get single project with tasks
     */
    public function show(Project $project): JsonResponse
    {
        return response()->json($project);
    }

    /**
     * Create new project
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:active,planning,completed,on_hold',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date'
        ]);

        $project = Project::create($validated);

        return response()->json($project, 201);
    }

    /**
     * Update project
     */
    public function update(Request $request, Project $project): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:active,planning,completed,on_hold',
            'progress' => 'sometimes|integer|min:0|max:100'
        ]);

        $project->update($validated);

        return response()->json($project);
    }

    /**
     * Delete project
     */
    public function destroy(Project $project): JsonResponse
    {
        $project->delete();

        return response()->json(['message' => 'Project deleted successfully']);
    }
}
