// ============================================================
// ARKZEN EXAMPLE TATEMONO v5.0 — Notes System
// Simple notes with full CRUD, auth, multiple pages
// Drop this in tatemonos/notes/core.tsx to try it out
// ============================================================

/* @arkzen:meta
name: notes
version: 1.0.0
description: Notes system with auth and multiple pages
auth: true
*/

/* @arkzen:database:notes
table: notes
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  user_id:
    type: integer
    foreign: users.id
    onDelete: cascade
    nullable: false
  title:
    type: string
    length: 255
    nullable: false
  content:
    type: text
    nullable: true
  pinned:
    type: boolean
    default: false
seeder:
  count: 3
  data:
    - title: Welcome Note
      content: This is your first note. Edit or delete it anytime.
      pinned: true
*/

/* @arkzen:api:notes
model: Note
controller: NoteController
prefix: /api/notes
middleware: [auth:sanctum]
endpoints:
  index:
    method: GET
    route: /
    description: Get all notes for current user
    response:
      type: paginated
  store:
    method: POST
    route: /
    description: Create note
    validation:
      title: required|string|max:255
      content: nullable|string
    response:
      type: single
  update:
    method: PUT
    route: /{id}
    description: Update note
    validation:
      title: sometimes|string|max:255
      content: nullable|string
      pinned: sometimes|boolean
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete note
    response:
      type: message
      value: Note deleted
*/

/* @arkzen:components:shared */

'use client'

import React, { useState } from 'react'
import { useQuery }         from '@/arkzen/core/hooks/useQuery'
import { useMutation }      from '@/arkzen/core/hooks/useMutation'
import { useAuthStore }     from '@/arkzen/core/stores/authStore'
import { useToast }         from '@/arkzen/core/components/Toast'
import { Pin, Trash2, Plus, LogOut } from 'lucide-react'

interface Note {
  id:      number
  title:   string
  content: string | null
  pinned:  boolean
}

const NoteCard = ({
  note,
  onDelete,
  onPin,
}: {
  note: Note
  onDelete: () => void
  onPin:    () => void
}) => (
  <div className={`arkzen-card p-4 flex flex-col gap-2 ${note.pinned ? 'ring-2 ring-neutral-900' : ''}`}>
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-semibold text-sm leading-snug flex-1">{note.title}</h3>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onPin}    className={`p-1.5 rounded-lg transition-colors ${note.pinned ? 'text-neutral-900 bg-neutral-100' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'}`}>
          <Pin size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
    {note.content && <p className="text-xs text-neutral-500 line-clamp-3">{note.content}</p>}
  </div>
)

/* @arkzen:components:shared:end */

/* @arkzen:page:login */
/* @arkzen:page:layout:guest */
const LoginPage = () => {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-black/5 ring-1 ring-black/5 p-8">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg">✎</span>
          </div>
          <h1 className="font-semibold text-lg">Notes</h1>
          <p className="text-sm text-neutral-500 mt-1">Sign in to your notes</p>
        </div>
        <div className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="arkzen-input w-full" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="arkzen-input w-full" />
          <button onClick={() => login(email, password)} disabled={isLoading} className="arkzen-btn-primary w-full">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
        <p className="text-center text-xs text-neutral-400 mt-4">
          No account? <a href="/notes/register" className="text-neutral-700 hover:underline">Register</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:login:end */

/* @arkzen:page:register */
/* @arkzen:page:layout:guest */
const RegisterPage = () => {
  const { register, isLoading } = useAuthStore()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-black/5 ring-1 ring-black/5 p-8">
        <h1 className="font-semibold text-lg text-center mb-6">Create Account</h1>
        <div className="space-y-3">
          <input type="text"     placeholder="Full Name"        value={name}     onChange={e => setName(e.target.value)}     className="arkzen-input w-full" />
          <input type="email"    placeholder="Email"            value={email}    onChange={e => setEmail(e.target.value)}    className="arkzen-input w-full" />
          <input type="password" placeholder="Password"         value={password} onChange={e => setPassword(e.target.value)} className="arkzen-input w-full" />
          <input type="password" placeholder="Confirm Password" value={confirm}  onChange={e => setConfirm(e.target.value)}  className="arkzen-input w-full" />
          <button onClick={() => register(name, email, password, confirm)} disabled={isLoading} className="arkzen-btn-primary w-full">
            {isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
        <p className="text-center text-xs text-neutral-400 mt-4">
          Have an account? <a href="/notes/login" className="text-neutral-700 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
/* @arkzen:page:register:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:auth */
const IndexPage = () => {
  const { user, logout }               = useAuthStore()
  const { toast }                       = useToast()
  const { data, isLoading, refetch }    = useQuery<{ data: Note[] }>('/api/notes')
  const notes                           = data?.data ?? []

  const [newTitle, setNewTitle]   = useState('')
  const [newContent, setNewContent] = useState('')
  const [showForm, setShowForm]   = useState(false)

  const { mutate: createNote, isLoading: creating } = useMutation<unknown, { title: string; content: string }>({
    method:      'POST',
    invalidates: ['/api/notes'],
    onSuccess:   () => { toast.success('Note created'); setNewTitle(''); setNewContent(''); setShowForm(false) },
    onError:     (err) => toast.error(String(err)),
  })

  const { mutate: deleteNote } = useMutation<unknown, unknown>({
    method:      'DELETE',
    invalidates: ['/api/notes'],
    onSuccess:   () => toast.success('Note deleted'),
  })

  const { mutate: updateNote } = useMutation<unknown, { pinned: boolean }>({
    method:      'PUT',
    invalidates: ['/api/notes'],
  })

  const pinned   = notes.filter(n => n.pinned)
  const unpinned = notes.filter(n => !n.pinned)

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Topbar */}
      <header className="h-14 bg-white border-b border-neutral-200 px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-lg">✎</span>
          <span className="font-semibold">Notes</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 hidden sm:block">{user?.name}</span>
          <button onClick={() => setShowForm(true)} className="arkzen-btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> New Note
          </button>
          <button onClick={logout} className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* New note form */}
        {showForm && (
          <div className="arkzen-card p-4 mb-6">
            <input
              type="text"
              placeholder="Note title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="arkzen-input w-full mb-3"
              autoFocus
            />
            <textarea
              placeholder="Note content (optional)..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              rows={3}
              className="arkzen-input w-full resize-none mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="arkzen-btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => createNote('/api/notes', { title: newTitle, content: newContent })}
                disabled={!newTitle || creating}
                className="arkzen-btn-primary text-sm"
              >
                {creating ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">✎</p>
            <h2 className="font-semibold text-lg mb-2">No notes yet</h2>
            <p className="text-neutral-500 text-sm">Click "New Note" to get started</p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Pinned</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {pinned.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onDelete={() => deleteNote(`/api/notes/${note.id}`, {})}
                      onPin={() => updateNote(`/api/notes/${note.id}`, { pinned: false })}
                    />
                  ))}
                </div>
              </div>
            )}
            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Other</h2>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {unpinned.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onDelete={() => deleteNote(`/api/notes/${note.id}`, {})}
                      onPin={() => updateNote(`/api/notes/${note.id}`, { pinned: true })}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
/* @arkzen:page:index:end */

/* @arkzen:animation */
import { gsap } from 'gsap'
import React from 'react'

const notesAnimations = (pageRef: React.RefObject<HTMLDivElement>) => {
  const ctx = gsap.context(() => {
    gsap.fromTo('.arkzen-card',
      { opacity: 0, y: 12, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
    )
  }, pageRef)
  return () => ctx.revert()
}

export const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
}
/* @arkzen:animation:end */
