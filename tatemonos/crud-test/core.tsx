/* @arkzen:meta
name: crud-test
version: 1.0.0
description: Tests the full CRUD pipeline — Model, Migration, Controller, Request, Resource, Policy, Factory, Seeder — all isolated under crud-test slug. The canonical Arkzen CRUD verification.
auth: true
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
modal:
  borderRadius: 2xl
  backdrop: blur
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
  auth:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:items
table: items
timestamps: true
softDeletes: false
columns:
  name:
    type: string
    length: 255
    nullable: false
  description:
    type: text
    nullable: true
  status:
    type: string
    length: 50
    default: active
  priority:
    type: integer
    default: 0
  tags:
    type: string
    nullable: true
seeder:
  count: 5
  data:
    - name: Alpha Item
      description: First seeded item for CRUD testing
      status: active
      priority: 1
      tags: test,seed
    - name: Beta Item
      description: Second seeded item
      status: pending
      priority: 2
      tags: test
*/

/* @arkzen:api
middleware: [auth]
routes:
  - GET    /crud-test/items          → index
  - POST   /crud-test/items          → store
  - GET    /crud-test/items/{id}     → show
  - PUT    /crud-test/items/{id}     → update
  - DELETE /crud-test/items/{id}     → destroy
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect } from 'react'
import { useAuthStore, arkzenFetch } from '@/arkzen/core/stores/authStore'

type Item = {
  id: number
  name: string
  description: string | null
  status: 'active' | 'pending' | 'archived'
  priority: number
  tags: string | null
  created_at: string
  updated_at: string
}

type FormData = { name: string; description: string; status: string; priority: number; tags: string }
const emptyForm: FormData = { name: '', description: '', status: 'active', priority: 0, tags: '' }

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const handleSubmit = async () => {
    setError(null)
    try { await login(email, password) }
    catch (e) { setError(e instanceof Error ? e.message : 'Login failed') }
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6">CRUD Test — Login</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
        <div className="space-y-3">
          <input className="arkzen-input w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input className="arkzen-input w-full" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button className="arkzen-btn w-full" onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Signing in...' : 'Sign In'}</button>
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:dashboard */
/* @arkzen:page:layout:auth */
const DashboardPage = () => {
  const { user, logout } = useAuthStore()
  const [items, setItems]           = useState<Item[]>([])
  const [loading, setLoading]       = useState(true)
  const [form, setForm]             = useState<FormData>(emptyForm)
  const [editing, setEditing]       = useState<Item | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState<number | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [stats, setStats]           = useState({ total: 0, active: 0, pending: 0, archived: 0 })

  const load = async () => {
    setLoading(true)
    try {
      const res = await arkzenFetch('/api/crud-test/items')
      const d   = await res.json()
      const data: Item[] = d.data ?? []
      setItems(data)
      setStats({
        total:    data.length,
        active:   data.filter(i => i.status === 'active').length,
        pending:  data.filter(i => i.status === 'pending').length,
        archived: data.filter(i => i.status === 'archived').length,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(null); setShowForm(true) }
  const openEdit   = (item: Item) => {
    setEditing(item)
    setForm({ name: item.name, description: item.description ?? '', status: item.status, priority: item.priority, tags: item.tags ?? '' })
    setError(null)
    setShowForm(true)
  }
  const closeForm  = () => { setShowForm(false); setEditing(null); setError(null) }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const url    = editing ? `/api/crud-test/items/${editing.id}` : '/api/crud-test/items'
      const method = editing ? 'PUT' : 'POST'
      const res    = await arkzenFetch(url, { method, body: JSON.stringify(form) })
      const d      = await res.json()
      if (!res.ok) throw new Error(d.message ?? (d.errors ? Object.values(d.errors).flat().join(', ') : 'Save failed'))
      closeForm()
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    setDeleting(id)
    try {
      await arkzenFetch(`/api/crud-test/items/${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
      setStats(prev => ({ ...prev, total: prev.total - 1 }))
    } catch {} finally {
      setDeleting(null)
    }
  }

  const statusColor = (s: string) => ({
    active:   'bg-green-100 text-green-700',
    pending:  'bg-yellow-100 text-yellow-700',
    archived: 'bg-neutral-100 text-neutral-500',
  }[s] ?? 'bg-neutral-100 text-neutral-600')

  return (
    <div className="min-h-screen p-8">
      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="font-semibold mb-4">{editing ? 'Edit Item' : 'Create Item'}</h2>
            {error && <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
            <div className="space-y-3">
              <input className="arkzen-input w-full" placeholder="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <textarea className="arkzen-input w-full h-20 resize-none" placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <select className="arkzen-input w-full" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="archived">Archived</option>
              </select>
              <input className="arkzen-input w-full" type="number" placeholder="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
              <input className="arkzen-input w-full" placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div className="flex gap-2 mt-5">
              <button className="arkzen-btn flex-1" onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              <button className="arkzen-btn-ghost flex-1" onClick={closeForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🔧 CRUD Test</h1>
          <div className="flex items-center gap-2">
            <button className="arkzen-btn text-sm" onClick={openCreate}>+ Create Item</button>
            <button className="arkzen-btn-ghost text-sm" onClick={logout}>Logout ({user?.name})</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[['Total', stats.total, 'text-neutral-900'], ['Active', stats.active, 'text-green-600'], ['Pending', stats.pending, 'text-yellow-600'], ['Archived', stats.archived, 'text-neutral-400']].map(([label, count, cls]) => (
            <div key={String(label)} className="bg-white rounded-2xl border border-neutral-100 p-4 text-center">
              <div className={`text-2xl font-bold ${cls}`}>{count}</div>
              <div className="text-xs text-neutral-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Items</h2>
            <button className="text-xs text-neutral-400" onClick={load}>Refresh</button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-neutral-400">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">
              No items yet. Click "Create Item" or check that the seeder ran.
            </div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {items.map(item => (
                <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${statusColor(item.status)}`}>{item.status}</span>
                      {item.priority > 0 && <span className="text-xs text-neutral-400">P{item.priority}</span>}
                    </div>
                    {item.description && <p className="text-xs text-neutral-500 truncate">{item.description}</p>}
                    {item.tags && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.split(',').map(t => (
                          <span key={t} className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="text-xs text-neutral-500 hover:text-neutral-900" onClick={() => openEdit(item)}>Edit</button>
                    <button
                      className="text-xs text-red-400 hover:text-red-600"
                      onClick={() => remove(item.id)}
                      disabled={deleting === item.id}
                    >
                      {deleting === item.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>What this tests:</strong> ModelBuilder (crud-test slug, isolated DB), MigrationBuilder (items table), ControllerBuilder (CRUD routes), RequestBuilder (validation), ResourceBuilder (JSON transform), FactoryBuilder, SeederBuilder — all isolated under <code>crud-test</code> slug. No other tatemono is affected.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */
