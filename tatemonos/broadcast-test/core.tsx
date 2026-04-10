/* @arkzen:meta
name: broadcast-test
version: 1.0.0
description: Tests Laravel Reverb broadcasting end-to-end. Public channel live counter + private channel message feed.
auth: false
*/

/* @arkzen:config
toast:
  position: top-right
  duration: 3000
layout:
  guest:
    className: "min-h-screen bg-neutral-50"
*/

/* @arkzen:database:messages
table: messages
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  content:
    type: string
    length: 500
    nullable: false
  channel:
    type: string
    length: 100
    nullable: true
*/

/* @arkzen:api:messages
model: Message
controller: MessageController
prefix: /api/broadcast-test/messages
middleware: []
endpoints:
  index:
    method: GET
    route: /
    description: Get recent messages
    response:
      type: paginated
  store:
    method: POST
    route: /
    description: Send a message and broadcast it
    type: broadcast
    validation:
      content: required|string|max:500
      channel: sometimes|string|max:100
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete a message
    response:
      type: message
      value: Message deleted
*/

/* @arkzen:realtime:broadcast-test-public
type: public
*/
/* @arkzen:realtime:broadcast-test-public:end */

/* @arkzen:realtime:message-sent
channel: broadcast-test-public
type: public
*/
/* @arkzen:realtime:message-sent:end */

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

interface Message {
  id:         number
  content:    string
  channel:    string | null
  created_at: string
}

/* @arkzen:components:shared:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:guest */
const IndexPage = () => {
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [publicCount, setPublicCount] = useState(0)
  const [wsStatus, setWsStatus]       = useState<'connecting' | 'connected' | 'error'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    arkzenFetch('/api/broadcast-test/messages')
      .then(r => r.json())
      .then(d => setMessages(d.data ?? []))
      .catch(() => {})

    try {
      const ws = new WebSocket('ws://localhost:8080/app/arkzen-key')
      wsRef.current = ws

      ws.onopen = () => {
        setWsStatus('connected')
        ws.send(JSON.stringify({ 
          event: 'pusher:subscribe', 
          data: { channel: 'broadcast-test-public' } 
        }))
      }

      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (payload.event === 'broadcast-test.message-sent') {
            const data = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data
            setMessages(prev => [data, ...prev].slice(0, 50))
            setPublicCount(c => c + 1)
          }
        } catch (err) {
          console.error('Failed to parse message:', err)
        }
      }

      ws.onerror = () => {
        setWsStatus('error')
        console.error('WebSocket error')
      }
      
      ws.onclose = () => {
        setWsStatus('error')
        console.log('WebSocket closed')
      }

      return () => {
        if (wsRef.current) {
          wsRef.current.close()
        }
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setWsStatus('error')
    }
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return
    try {
      await arkzenFetch('/api/broadcast-test/messages', {
        method: 'POST',
        body:   JSON.stringify({ content: input, channel: 'broadcast-test-public' }),
      })
      setInput('')
    } catch (e) { 
      console.error(e) 
    }
  }

  const statusColor = {
    connecting: 'bg-yellow-400',
    connected:  'bg-green-400',
    error:      'bg-red-400',
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📡 Broadcast Test</h1>
            <p className="text-sm text-neutral-500 mt-1">Public channel — no auth required</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${statusColor[wsStatus]}`} />
            <span className="text-neutral-600 capitalize">{wsStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-neutral-100">
            <div className="text-3xl font-bold text-neutral-900">{publicCount}</div>
            <div className="text-sm text-neutral-500 mt-1">Events received this session</div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-neutral-100">
            <div className="text-3xl font-bold text-neutral-900">{messages.length}</div>
            <div className="text-sm text-neutral-500 mt-1">Total messages in DB</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100">
          <h2 className="font-semibold mb-3">Send broadcast message</h2>
          <div className="flex gap-2">
            <input
              className="arkzen-input flex-1"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message and hit Enter..."
            />
            <button className="arkzen-btn" onClick={sendMessage}>Send</button>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            POST /api/broadcast-test/messages → Laravel broadcasts MessageSent → all connected clients receive it in real-time.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="font-semibold">Live feed</h2>
          </div>
          {messages.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-sm">No messages yet. Send one above.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {messages.map((m, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium shrink-0">
                    💬
                  </div>
                  <p className="text-sm text-neutral-700">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {wsStatus === 'error' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
            <strong>WebSocket not connected.</strong> Make sure Laravel Reverb is running:{' '}
            <code className="bg-amber-100 px-1 rounded">php artisan reverb:start</code>
          </div>
        )}
      </div>
    </div>
  )
}
/* @arkzen:page:index:end */