/* @arkzen:meta
name: scheduler-test
version: 2.0.0
description: Tests Laravel Console Commands + Scheduler. Register Artisan commands, run them manually, inspect execution history.
auth: false
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 4000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database
table: command_runs
timestamps: true
softDeletes: false

columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  command_name:
    type: string
    length: 100
    nullable: false
  signature:
    type: string
    length: 150
    nullable: false
  exit_code:
    type: integer
    nullable: false
    default: 0
  output:
    type: text
    nullable: true
  triggered_by:
    type: string
    length: 50
    nullable: false
    default: manual
  duration_ms:
    type: integer
    nullable: true
*/

/* @arkzen:api
model: CommandRun
controller: CommandRunController
prefix: /api/scheduler-test
middleware: []
resource: false
policy: false
factory: false

endpoints:
  index:
    method: GET
    route: /runs
    description: Get all command run records
    response:
      type: paginated

  store:
    method: POST
    route: /run
    description: Execute a command and record the result
    type: command_run
    validation:
      command: required|string
      triggered_by: sometimes|string
    response:
      type: single

  destroy:
    method: DELETE
    route: /runs
    description: Clear all run records
    response:
      type: message
      value: Runs cleared
*/

/* @arkzen:console:cleanup-temp
signature: scheduler-test:cleanup-temp
description: Deletes temporary files older than 24h
schedule: '0 * * * *'
*/
public function handle(): int
{
    $start = microtime(true);
    $this->info('[Arkzen:scheduler-test] Running cleanup-temp...');

    \App\Models\Arkzen\SchedulerTest\CommandRun::create([
        'command_name' => 'cleanup-temp',
        'signature'    => 'scheduler-test:cleanup-temp',
        'exit_code'    => 0,
        'output'       => 'Cleanup completed successfully.',
        'triggered_by' => 'schedule',
        'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
    ]);

    $this->info('[Arkzen:scheduler-test] ✓ Done');
    return Command::SUCCESS;
}
/* @arkzen:console:cleanup-temp:end */

/* @arkzen:console:generate-report
signature: scheduler-test:generate-report
description: Generates a daily activity report
schedule: '0 8 * * *'
*/
public function handle(): int
{
    $start = microtime(true);
    $this->info('[Arkzen:scheduler-test] Generating report...');

    \App\Models\Arkzen\SchedulerTest\CommandRun::create([
        'command_name' => 'generate-report',
        'signature'    => 'scheduler-test:generate-report',
        'exit_code'    => 0,
        'output'       => 'Daily report generated successfully.',
        'triggered_by' => 'schedule',
        'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
    ]);

    $this->info('[Arkzen:scheduler-test] ✓ Done');
    return Command::SUCCESS;
}
/* @arkzen:console:generate-report:end */

/* @arkzen:console:ping-health
signature: scheduler-test:ping-health
description: Pings all services and records health status
schedule: '*/5 * * * *'
*/
public function handle(): int
{
    $start = microtime(true);
    $this->info('[Arkzen:scheduler-test] Pinging services...');

    \App\Models\Arkzen\SchedulerTest\CommandRun::create([
        'command_name' => 'ping-health',
        'signature'    => 'scheduler-test:ping-health',
        'exit_code'    => 0,
        'output'       => 'All services healthy.',
        'triggered_by' => 'schedule',
        'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
    ]);

    $this->info('[Arkzen:scheduler-test] ✓ Done');
    return Command::SUCCESS;
}
/* @arkzen:console:ping-health:end */

/* @arkzen:console:sync-data
signature: scheduler-test:sync-data
description: Syncs data from external source
schedule: '*/15 * * * *'
*/
public function handle(): int
{
    $start = microtime(true);
    $this->info('[Arkzen:scheduler-test] Syncing data...');

    \App\Models\Arkzen\SchedulerTest\CommandRun::create([
        'command_name' => 'sync-data',
        'signature'    => 'scheduler-test:sync-data',
        'exit_code'    => 0,
        'output'       => 'Data synced successfully.',
        'triggered_by' => 'schedule',
        'duration_ms'  => (int) ((microtime(true) - $start) * 1000),
    ]);

    $this->info('[Arkzen:scheduler-test] ✓ Done');
    return Command::SUCCESS;
}
/* @arkzen:console:sync-data:end */

/* @arkzen:components:shared */

'use client'

import React                        from 'react'
import { useMutation }              from '@/arkzen/core/hooks/useMutation'
import { useQuery }                 from '@/arkzen/core/hooks/useQuery'
import { useToast }                 from '@/arkzen/core/components/Toast'

interface CommandRun {
  id:           number
  command_name: string
  signature:    string
  exit_code:    number
  output:       string | null
  triggered_by: string
  duration_ms:  number | null
  created_at:   string
}

/* @arkzen:components:shared:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:guest */
const DashboardPage = () => {
  const { toast } = useToast()

  const commands = [
    { key: 'cleanup-temp',    label: 'Cleanup Temp',    signature: 'scheduler-test:cleanup-temp',    schedule: 'Every hour',    icon: '🧹' },
    { key: 'generate-report', label: 'Generate Report', signature: 'scheduler-test:generate-report', schedule: 'Daily at 8am', icon: '📊' },
    { key: 'ping-health',     label: 'Ping Health',     signature: 'scheduler-test:ping-health',     schedule: 'Every 5 min',  icon: '💓' },
    { key: 'sync-data',       label: 'Sync Data',       signature: 'scheduler-test:sync-data',       schedule: 'Every 15 min', icon: '🔄' },
  ]

  const { data: runsData, refetch } = useQuery<{ data: CommandRun[] }>('/api/scheduler-test/runs', {
    params: { per_page: 50 },
  })

  const runs = runsData?.data ?? []

  const { mutate: runCommand, isLoading: running, variables: runningKey } = useMutation<CommandRun, { command: string; triggered_by: string }>({
    method:      'POST',
    invalidates: ['/api/scheduler-test/runs'],
    onSuccess:   () => {
      toast.success('Command executed');
      refetch();   // Force a refetch to update the history immediately
    },
    onError:     (err) => toast.error(err),
  })

  const { mutate: clearRuns, isLoading: clearing } = useMutation({
    method:      'DELETE',
    invalidates: ['/api/scheduler-test/runs'],
    onSuccess:   () => {
      toast.success('Runs cleared');
      refetch();   // Also refetch after clearing
    },
  })

  const exitCodeBadge  = (code: number) => code === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  const triggeredBadge = (t: string)    => t === 'manual' ? 'bg-blue-100 text-blue-600' : 'bg-neutral-100 text-neutral-500'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold">⏰ Scheduler Test</h1>
          <p className="text-sm text-neutral-500 mt-1">Run commands manually or let the scheduler fire them.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {commands.map(cmd => (
            <div key={cmd.key} className="bg-white rounded-2xl border border-neutral-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>{cmd.icon}</span>
                <span className="font-medium text-sm">{cmd.label}</span>
              </div>
              <code className="text-xs text-neutral-400 block mb-1">{cmd.signature}</code>
              <div className="text-xs text-neutral-500 mb-3">🕐 {cmd.schedule}</div>
              <button
                className="arkzen-btn-primary w-full text-sm"
                onClick={() => runCommand('/api/scheduler-test/run', { command: cmd.key, triggered_by: 'manual' })}
                disabled={!!running}
              >
                {running && runningKey?.command === cmd.key ? 'Running...' : 'Run now'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Execution history</h2>
            <div className="flex gap-3">
              <button className="text-xs text-neutral-400" onClick={refetch}>Refresh</button>
              {runs.length > 0 && (
                <button className="text-xs text-red-400" onClick={() => clearRuns('/api/scheduler-test/runs')} disabled={clearing}>
                  {clearing ? '...' : 'Clear'}
                </button>
              )}
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No runs yet. Click "Run now" on any command above.
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {runs.map((r) => (
                <div key={r.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-medium text-neutral-700">{r.signature}</code>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${triggeredBadge(r.triggered_by)}`}>
                        {r.triggered_by}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.duration_ms != null && <span className="text-xs text-neutral-400">{r.duration_ms}ms</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${exitCodeBadge(r.exit_code)}`}>
                        exit {r.exit_code}
                      </span>
                    </div>
                  </div>
                  {r.output && (
                    <pre className="text-xs text-neutral-400 bg-neutral-50 rounded-lg p-2 mt-1 overflow-x-auto whitespace-pre-wrap">{r.output}</pre>
                  )}
                  <div className="text-xs text-neutral-300 mt-1">{r.created_at}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>Schedule:</strong> Run <code>* * * * * php /path/to/artisan schedule:run</code> via crontab.<br/>
          <strong>Commands are scoped:</strong> All signatures are prefixed with <code>scheduler-test:</code> so they never collide with other tatemonos.<br/>
          <strong>Run all now:</strong> <code>php artisan schedule:run</code>
        </div>

      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */