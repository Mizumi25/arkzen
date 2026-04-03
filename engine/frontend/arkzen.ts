// ============================================================
// ARKZEN ENGINE v5.0 — ENTRY POINT
// Run this to start the Arkzen Engine
// ============================================================

import { startWatcher } from './arkzen/core/watcher'

startWatcher().catch(error => {
  console.error('[Arkzen] Fatal error starting engine:', error)
  process.exit(1)
})
