#!/usr/bin/env node

// ============================================================
// ARKZEN ENGINE — TATEMONO VALIDATOR v5.0
// Pre-build validation CLI.
//
// Usage:
//   node validate.js <tatemono-name>
//   node validate.js client-portal
//
// Validates WITHOUT building. Safe to run at any time.
// ============================================================

const path = require('path')
const fs   = require('fs')

const ROOT_DIR    = path.resolve(__dirname, '..', '..')
const MODULES_DIR = path.join(ROOT_DIR, 'tatemonos')

const tatemononName = process.argv[2]

if (!tatemononName) {
  console.log('\n  Usage: node validate.js <tatemono-name>')
  console.log('  Example: node validate.js client-portal\n')
  process.exit(1)
}

const filePath = path.join(MODULES_DIR, tatemononName, 'core.tsx')

if (!fs.existsSync(filePath)) {
  console.error(`\n  ✗ Tatemono not found: ${filePath}\n`)
  process.exit(1)
}

// Dynamically require the compiled validator
// (ts-node or compiled JS)
try {
  // Try ts-node first (dev environment)
  require('ts-node').register({ transpileOnly: true })
  const { validateTatemono } = require('./arkzen/core/validator')
  const result = validateTatemono(filePath)
  process.exit(result.valid ? 0 : 1)
} catch (e) {
  // Try compiled JS
  try {
    const { validateTatemono } = require('./dist/arkzen/core/validator')
    const result = validateTatemono(filePath)
    process.exit(result.valid ? 0 : 1)
  } catch (e2) {
    console.error('\n  ✗ Could not load validator. Make sure ts-node is installed:')
    console.error('    npm install -D ts-node\n')
    process.exit(1)
  }
}
