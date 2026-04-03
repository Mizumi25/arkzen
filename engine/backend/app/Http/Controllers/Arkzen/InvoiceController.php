<?php

// ============================================================
// ARKZEN GENERATED CONTROLLER — InvoiceController
// DO NOT EDIT DIRECTLY. Edit the tatemono file instead.
// Generated: 2026-04-03T04:50:36.267271Z
// ============================================================

namespace App\Http\Controllers\Arkzen;

use Illuminate\Routing\Controller;
use App\Models\Arkzen\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InvoiceController extends Controller
{
    /**
     * Get paginated invoices
     */
    public function index(Request $request): JsonResponse
    {
        $query = Invoice::query();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        $perPage = $request->get('per_page', 15);
        $results = $query->paginate($perPage);

        return response()->json($results);
    }

    /**
     * Get single invoice
     */
    public function show(Invoice $invoice): JsonResponse
    {
        return response()->json($invoice);
    }
}
