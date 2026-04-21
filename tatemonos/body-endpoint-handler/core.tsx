/* @arkzen:meta
name: body-endpoint-handler
version: 1.0.0
description: "Tests ControllerBuilder v7.0 @arkzen:endpoint body injection and CustomRouteBuilder v2.0 @arkzen:handler body injection. Both builders accept base64-encoded PHP between the DSL block markers. This tatemono verifies that custom api endpoint methods and standalone route handlers use the injected PHP body instead of the Not implemented stub."
auth: false
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3500
layout:
  guest:
    className: "min-h-screen bg-zinc-50"
*/

/* @arkzen:database:probe_results
table: probe_results
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  source:
    type: string
    length: 50
    nullable: false
  probe:
    type: string
    length: 100
    nullable: false
  payload:
    type: text
    nullable: true
  result:
    type: text
    nullable: true
  ok:
    type: boolean
    default: true
seeder:
  count: 3
  data:
    - source: seeder
      probe: init-check
      payload: '{"msg":"seeded"}'
      result: Seeded probe entry
      ok: true
    - source: seeder
      probe: health-ping
      payload: null
      result: All systems nominal
      ok: true
    - source: seeder
      probe: error-sample
      payload: '{"trigger":"simulated"}'
      result: Simulated failure recorded
      ok: false
*/

/* @arkzen:api:probe_results
model: ProbeResult
controller: ProbeResultController
prefix: /api/body-endpoint-handler
middleware: []
resource: false
policy: false
factory: false
endpoints:
  index:
    method: GET
    route: /probes
    description: List all probe results
    response:
      type: collection
  store:
    method: POST
    route: /probes
    description: Create a probe result entry — standard store, not body-injected, kept as baseline
    validation:
      source: required|string|max:50
      probe: required|string|max:100
      payload: nullable|string
    response:
      type: single
  echo:
    method: POST
    route: /echo
    description: "Custom endpoint — @arkzen:endpoint body injection. Echoes the request body back with metadata. Tests ControllerBuilder v7.0 body injection."
    response:
      type: single
  stats:
    method: GET
    route: /stats
    description: "Custom endpoint — @arkzen:endpoint body injection. Returns aggregate counts from probe_results. Tests ControllerBuilder v7.0 body injection."
    response:
      type: single
  destroy:
    method: DELETE
    route: /probes/{id}
    description: Delete a probe result
    response:
      type: message
      value: Probe deleted
*/

/* ─── ControllerBuilder body injection ────────────────────────────────────────
   @arkzen:endpoint:echo  →  injected into ProbeResultController::echo()
   The block name must match the endpoint key exactly (case-sensitive).
   PHP between */ and :end is base64-encoded by parser.ts and stored as
   $endpoint['body'] which ControllerBuilder::generateCustomMethod() decodes.
   ─────────────────────────────────────────────────────────────────────────── */

/* @arkzen:endpoint:echo
*/
$input   = $request->all();
$count   = count($input);
$record  = \App\Models\Arkzen\BodyEndpointHandler\ProbeResult::create([
    'source'  => 'endpoint-body',
    'probe'   => 'echo',
    'payload' => json_encode($input),
    'result'  => "Echoed {$count} field(s) — ControllerBuilder v7.0 body injection ✓",
    'ok'      => true,
]);
return response()->json([
    'injected'    => true,
    'builder'     => 'ControllerBuilder v7.0',
    'method'      => 'echo',
    'field_count' => $count,
    'echo'        => $input,
    'probe_id'    => $record->id,
]);
/* @arkzen:endpoint:echo:end */

/* @arkzen:endpoint:stats
*/
$total   = \App\Models\Arkzen\BodyEndpointHandler\ProbeResult::count();
$passed  = \App\Models\Arkzen\BodyEndpointHandler\ProbeResult::where('ok', true)->count();
$failed  = \App\Models\Arkzen\BodyEndpointHandler\ProbeResult::where('ok', false)->count();
$sources = \App\Models\Arkzen\BodyEndpointHandler\ProbeResult::select('source')
               ->distinct()
               ->pluck('source');
return response()->json([
    'injected' => true,
    'builder'  => 'ControllerBuilder v7.0',
    'method'   => 'stats',
    'total'    => $total,
    'passed'   => $passed,
    'failed'   => $failed,
    'sources'  => $sources,
]);
/* @arkzen:endpoint:stats:end */

/* ─── CustomRouteBuilder body injection ───────────────────────────────────────
   @arkzen:routes DSL block declares standalone routes without a model.
   @arkzen:handler:name blocks inject PHP into the generated handler method.
   The handler name must match the `handler` key in the routes array.
   ─────────────────────────────────────────────────────────────────────────── */

/* @arkzen:routes
controller: ProbeUtilController
middleware: []
routes:
  - method: GET
    route: /api/body-endpoint-handler/ping
    handler: ping
  - method: POST
    route: /api/body-endpoint-handler/record-handler
    handler: recordHandler
  - method: GET
    route: /api/body-endpoint-handler/latest
    handler: latest
*/

/* @arkzen:handler:ping
*/
return response()->json([
    'injected'   => true,
    'builder'    => 'CustomRouteBuilder v2.0',
    'handler'    => 'ping',
    'status'     => 'ok',
    'timestamp'  => now()->toIso8601String(),
    'message'    => 'CustomRouteBuilder handler body injection confirmed ✓',
]);
/* @arkzen:handler:ping:end */

/* @arkzen:handler:recordHandler
*/
$validated = $request->validate([
    'probe'   => 'required|string|max:100',
    'payload' => 'nullable|string',
    'ok'      => 'sometimes|boolean',
]);
$record = \App\Models\Arkzen\BodyEndpointHandler\ProbeResult::create([
    'source'  => 'handler-body',
    'probe'   => $validated['probe'],
    'payload' => $validated['payload'] ?? null,
    'result'  => 'Recorded via CustomRouteBuilder handler body injection ✓',
    'ok'      => $validated['ok'] ?? true,
]);
return response()->json([
    'injected'  => true,
    'builder'   => 'CustomRouteBuilder v2.0',
    'handler'   => 'recordHandler',
    'probe_id'  => $record->id,
    'probe'     => $record->probe,
]);
/* @arkzen:handler:recordHandler:end */

/* @arkzen:handler:latest
*/
$latest = \App\Models\Arkzen\BodyEndpointHandler\ProbeResult::latest()->take(5)->get();
return response()->json([
    'injected' => true,
    'builder'  => 'CustomRouteBuilder v2.0',
    'handler'  => 'latest',
    'count'    => $latest->count(),
    'results'  => $latest,
]);
/* @arkzen:handler:latest:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

function useToast() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const show = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }, [])
  return {
    toast,
    success: (msg: string) => show('success', msg),
    error:   (msg: string) => show('error', msg),
  }
}

type ProbeResult = {
  id:         number
  source:     string
  probe:      string
  payload:    string | null
  result:     string | null
  ok:         boolean
  created_at: string
}

type Stats = {
  injected: boolean
  builder:  string
  method:   string
  total:    number
  passed:   number
  failed:   number
  sources:  string[]
}

const Tag = ({ label, color }: { label: string; color: string }) => (
  <span style={{
    display: 'inline-block', padding: '2px 9px', borderRadius: 20,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
    background: color + '22', color,
  }}>{label}</span>
)

const InjectedBadge = ({ injected }: { injected: boolean }) => (
  <Tag label={injected ? '✓ BODY INJECTED' : '✗ STUB'} color={injected ? '#16a34a' : '#dc2626'} />
)

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const { toast, success: toastSuccess, error: toastError } = useToast()

  const [probes,   setProbes]   = useState<ProbeResult[]>([])
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [ping,     setPing]     = useState<Record<string, any> | null>(null)
  const [latest,   setLatest]   = useState<ProbeResult[]>([])
  const [loading,  setLoading]  = useState(false)

  // Echo form state
  const [echoFields, setEchoFields] = useState([{ key: 'hello', value: 'world' }])
  const [echoing,    setEchoing]    = useState(false)
  const [echoResult, setEchoResult] = useState<Record<string, any> | null>(null)

  // Handler record form
  const [hProbe,  setHProbe]  = useState('handler-probe')
  const [hOk,     setHOk]     = useState(true)
  const [hRecording, setHRecording] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [probesRes, statsRes, latestRes] = await Promise.all([
        arkzenFetch('/api/body-endpoint-handler/probes'),
        arkzenFetch('/api/body-endpoint-handler/stats'),
        arkzenFetch('/api/body-endpoint-handler/latest'),
      ])
      const pd = await probesRes.json(); setProbes(pd.data ?? pd ?? [])
      const sd = await statsRes.json();  setStats(sd)
      const ld = await latestRes.json(); setLatest(ld.results ?? [])
    } catch { toastError('Failed to load') }
    setLoading(false)
  }

  const doPing = async () => {
    try {
      const res = await arkzenFetch('/api/body-endpoint-handler/ping')
      const d   = await res.json()
      setPing(d)
      toastSuccess('Ping OK — handler body confirmed')
    } catch { toastError('Ping failed') }
  }

  const doEcho = async () => {
    setEchoing(true)
    const body: Record<string, string> = {}
    echoFields.forEach(f => { if (f.key) body[f.key] = f.value })
    try {
      const res = await arkzenFetch('/api/body-endpoint-handler/echo', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const d = await res.json()
      setEchoResult(d)
      toastSuccess('Echo OK — endpoint body confirmed')
      loadAll()
    } catch { toastError('Echo failed') }
    setEchoing(false)
  }

  const doRecord = async () => {
    setHRecording(true)
    try {
      const res = await arkzenFetch('/api/body-endpoint-handler/record-handler', {
        method: 'POST',
        body: JSON.stringify({ probe: hProbe, ok: hOk }),
      })
      const d = await res.json()
      if (res.ok) { toastSuccess(`Recorded probe #${d.probe_id} via handler body`); loadAll() }
      else        { toastError('Record failed') }
    } catch { toastError('Record request failed') }
    setHRecording(false)
  }

  useEffect(() => { loadAll() }, [])

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 14, padding: 28,
    boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 20,
  }
  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #e4e4e7', borderRadius: 8,
    padding: '8px 12px', fontSize: 13, boxSizing: 'border-box' as const,
  }
  const btn = (color = '#18181b'): React.CSSProperties => ({
    background: color, color: '#fff', border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', padding: '32px 16px' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: toast.type === 'success' ? '#22c55e' : '#ef4444', color: '#fff', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast.msg}</div>}
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#18181b', margin: 0 }}>Body Injection — Endpoint & Handler</h1>
          <p style={{ fontSize: 13, color: '#71717a', margin: '6px 0 0' }}>
            <strong>ControllerBuilder v7.0</strong> <code>@arkzen:endpoint</code> ·{' '}
            <strong>CustomRouteBuilder v2.0</strong> <code>@arkzen:handler</code>
          </p>
        </div>

        {/* Stats card — ControllerBuilder endpoint body */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#18181b', margin: 0 }}>
                📊 Stats Endpoint <code style={{ fontSize: 11, color: '#94a3b8' }}>GET /stats</code>
              </h2>
              <p style={{ fontSize: 12, color: '#71717a', margin: '4px 0 0' }}>
                Injected via <code>@arkzen:endpoint:stats</code> — ControllerBuilder reads aggregate counts from DB.
              </p>
            </div>
            {stats && <InjectedBadge injected={stats.injected} />}
          </div>
          {loading ? <p style={{ color: '#a1a1aa', fontSize: 13 }}>Loading…</p> : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[['Total', stats.total, '#18181b'], ['Passed ✓', stats.passed, '#16a34a'], ['Failed ✗', stats.failed, '#dc2626']].map(([label, val, color]: any) => (
                <div key={label} style={{ background: '#fafafa', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          ) : null}
          <button onClick={loadAll} style={{ ...btn('#0ea5e9'), fontSize: 12, padding: '7px 14px', marginTop: 14 }}>Refresh Stats</button>
        </div>

        {/* Echo — ControllerBuilder endpoint body */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#18181b', marginTop: 0, marginBottom: 4 }}>
            🔁 Echo Endpoint <code style={{ fontSize: 11, color: '#94a3b8' }}>POST /echo</code>
          </h2>
          <p style={{ fontSize: 12, color: '#71717a', marginBottom: 16 }}>
            Injected via <code>@arkzen:endpoint:echo</code> — controller body echoes input and writes a probe result.
          </p>
          <div style={{ marginBottom: 12 }}>
            {echoFields.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 6 }}>
                <input value={f.key} onChange={e => { const n = [...echoFields]; n[i].key = e.target.value; setEchoFields(n) }} placeholder="key" style={inputStyle} />
                <input value={f.value} onChange={e => { const n = [...echoFields]; n[i].value = e.target.value; setEchoFields(n) }} placeholder="value" style={inputStyle} />
                <button onClick={() => setEchoFields(echoFields.filter((_, j) => j !== i))} style={{ ...btn('#ef4444'), padding: '8px 12px' }}>×</button>
              </div>
            ))}
            <button onClick={() => setEchoFields([...echoFields, { key: '', value: '' }])} style={{ ...btn('#6366f1'), padding: '6px 12px', fontSize: 12 }}>+ Add Field</button>
          </div>
          <button onClick={doEcho} disabled={echoing} style={btn()}>
            {echoing ? 'Echoing…' : 'Send Echo'}
          </button>
          {echoResult && (
            <div style={{ marginTop: 14, background: '#f4f4f5', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <InjectedBadge injected={echoResult.injected} />
                <span style={{ fontSize: 12, color: '#52525b' }}>{echoResult.builder} · {echoResult.field_count} field(s)</span>
              </div>
              <pre style={{ fontSize: 11, color: '#27272a', margin: 0, overflow: 'auto' }}>{JSON.stringify(echoResult.echo, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Ping — CustomRouteBuilder handler body */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#18181b', marginTop: 0, marginBottom: 4 }}>
            🏓 Ping Handler <code style={{ fontSize: 11, color: '#94a3b8' }}>GET /ping</code>
          </h2>
          <p style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>
            Injected via <code>@arkzen:handler:ping</code> — CustomRouteBuilder handler returns a status object with timestamp.
          </p>
          <button onClick={doPing} style={btn('#059669')}>Ping</button>
          {ping && (
            <div style={{ marginTop: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <InjectedBadge injected={ping.injected} />
                <span style={{ fontSize: 12, color: '#166534' }}>{ping.builder} · {ping.handler}</span>
              </div>
              <p style={{ fontSize: 13, color: '#15803d', margin: 0 }}>{ping.message}</p>
              <p style={{ fontSize: 11, color: '#86efac', margin: '4px 0 0' }}>{ping.timestamp}</p>
            </div>
          )}
        </div>

        {/* Record Handler — CustomRouteBuilder handler body */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#18181b', marginTop: 0, marginBottom: 4 }}>
            📝 Record Handler <code style={{ fontSize: 11, color: '#94a3b8' }}>POST /record-handler</code>
          </h2>
          <p style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>
            Injected via <code>@arkzen:handler:recordHandler</code> — validates, writes to DB, returns probe ID. Tests handler body with real DB write.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 12 }}>
            <input value={hProbe} onChange={e => setHProbe(e.target.value)} placeholder="probe name" style={{ ...inputStyle, width: '100%' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#3f3f46', cursor: 'pointer' }}>
              <input type="checkbox" checked={hOk} onChange={e => setHOk(e.target.checked)} />
              ok
            </label>
          </div>
          <button onClick={doRecord} disabled={hRecording} style={btn('#7c3aed')}>
            {hRecording ? 'Recording…' : 'Record via Handler'}
          </button>
        </div>

        {/* Latest 5 — CustomRouteBuilder handler body */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#18181b', margin: 0 }}>
                🕑 Latest Handler <code style={{ fontSize: 11, color: '#94a3b8' }}>GET /latest</code>
              </h2>
              <p style={{ fontSize: 12, color: '#71717a', margin: '4px 0 0' }}>
                Injected via <code>@arkzen:handler:latest</code> — returns 5 most recent probe results.
              </p>
            </div>
            <button onClick={loadAll} style={{ ...btn('#0ea5e9'), fontSize: 12, padding: '6px 12px' }}>Refresh</button>
          </div>
          {latest.length === 0 ? (
            <p style={{ color: '#a1a1aa', fontSize: 13 }}>No results yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {latest.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fafafa', borderRadius: 8, fontSize: 12 }}>
                  <Tag label={r.source} color={r.source === 'handler-body' ? '#7c3aed' : r.source === 'endpoint-body' ? '#0891b2' : '#64748b'} />
                  <span style={{ fontWeight: 600, color: '#18181b', flex: 1 }}>{r.probe}</span>
                  <Tag label={r.ok ? '✓' : '✗'} color={r.ok ? '#16a34a' : '#dc2626'} />
                  <span style={{ color: '#a1a1aa', fontSize: 11 }}>{new Date(r.created_at).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All probes log */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#18181b', marginTop: 0, marginBottom: 14 }}>All Probe Results</h2>
          {loading ? <p style={{ color: '#a1a1aa', fontSize: 13 }}>Loading…</p> : probes.length === 0 ? (
            <p style={{ color: '#a1a1aa', fontSize: 13 }}>No probes yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f4f4f5' }}>
                    {['#', 'Source', 'Probe', 'Result', 'Ok', 'Time'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#3f3f46' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {probes.map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>{r.id}</td>
                      <td style={{ padding: '8px 10px' }}><Tag label={r.source} color={r.source === 'handler-body' ? '#7c3aed' : r.source === 'endpoint-body' ? '#0891b2' : '#64748b'} /></td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#18181b' }}>{r.probe}</td>
                      <td style={{ padding: '8px 10px', color: '#52525b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.result ?? '—'}</td>
                      <td style={{ padding: '8px 10px' }}><Tag label={r.ok ? '✓' : '✗'} color={r.ok ? '#16a34a' : '#dc2626'} /></td>
                      <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>{new Date(r.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
/* @arkzen:page:index:end */