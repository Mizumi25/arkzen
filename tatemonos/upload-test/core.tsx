/* @arkzen:meta
name: upload-test
version: 1.0.0
description: Tests file uploads — single file, multiple files, image preview, download, delete. Backend stores in storage/app/public/arkzen/upload-test/.
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

/* @arkzen:database:uploaded_files
columns:
  user_id: integer
  original_name: string
  stored_name: string
  mime_type: string
  size_bytes: integer
  disk_path: string
  is_image: boolean
timestamps: true
*/

/* @arkzen:api
middleware: []
routes:
  - GET    /upload-test/files          → index
  - POST   /upload-test/files          → store
  - DELETE /upload-test/files/{id}     → destroy
  - GET    /upload-test/files/{id}/url → fileUrl
*/

/* @arkzen:components:shared */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { arkzenFetch } from '@/arkzen/core/stores/authStore'

/* @arkzen:components:shared:end */



/* @arkzen:page:dashboard */
/* @arkzen:page:layout:guest */
const DashboardPage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles]       = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const loadFiles = async () => {
    try {
      const res = await arkzenFetch('/api/upload-test/files')
      const d   = await res.json()
      setFiles(d.data ?? [])
    } catch {}
  }

  useEffect(() => { loadFiles() }, [])

  const upload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError(null)
    setProgress(0)

    const formData = new FormData()
    Array.from(fileList).forEach(f => formData.append('files[]', f))

    try {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload-test/files')
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('Accept', 'application/json')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else {
            try { reject(new Error(JSON.parse(xhr.responseText)?.message ?? 'Upload failed')) }
            catch { reject(new Error(`Upload failed (${xhr.status})`)) }
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(formData)
      })

      await loadFiles()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const deleteFile = async (id: number) => {
    setDeleting(id)
    try {
      await arkzenFetch(`/api/upload-test/files/${id}`, { method: 'DELETE' })
      setFiles(prev => prev.filter(f => f.id !== id))
    } catch {} finally {
      setDeleting(null)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  const fileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return '🖼️'
    if (mime.includes('pdf')) return '📄'
    if (mime.includes('zip') || mime.includes('rar')) return '🗜️'
    if (mime.includes('video/')) return '🎬'
    return '📁'
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📁 Upload Test</h1>
            <p className="text-sm text-neutral-500 mt-1">Run <code>php artisan storage:link</code> to enable public URLs.</p>
          </div>
          
        </div>

        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer
            ${dragOver ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => upload(e.target.files)}
          />
          <div className="text-3xl mb-2">☁️</div>
          <div className="text-sm font-medium text-neutral-700">Drop files here or click to browse</div>
          <div className="text-xs text-neutral-400 mt-1">Any file type. Max 10MB each.</div>

          {uploading && (
            <div className="mt-4">
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-neutral-500 mt-1">{progress}% uploaded</div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
        )}

        {/* File list */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="font-semibold">Uploaded files ({files.length})</h2>
            <button className="text-xs text-neutral-400" onClick={loadFiles}>Refresh</button>
          </div>
          {files.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-400">No files uploaded yet.</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {files.map(f => (
                <div key={f.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-xl shrink-0">{fileIcon(f.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.original_name}</div>
                    <div className="text-xs text-neutral-400">{formatSize(f.size_bytes)} · {f.mime_type}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {f.is_image && f.url && (
                      <a href={f.url} target="_blank" rel="noopener" className="text-xs text-blue-500 hover:underline">View</a>
                    )}
                    <a href={`/api/upload-test/files/${f.id}/url`} className="text-xs text-neutral-500 hover:underline">Download</a>
                    <button
                      className="text-xs text-red-400 hover:text-red-600"
                      onClick={() => deleteFile(f.id)}
                      disabled={deleting === f.id}
                    >
                      {deleting === f.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-400 bg-neutral-50 rounded-xl p-4">
          <strong>Backend stores files at:</strong> <code>storage/app/public/arkzen/upload-test/</code><br/>
          <strong>Access via:</strong> <code>http://localhost/storage/arkzen/upload-test/filename</code><br/>
          <strong>Upload progress</strong> uses XHR instead of fetch — XHR supports <code>onprogress</code>, fetch does not.
        </div>
      </div>
    </div>
  )
}
/* @arkzen:page:dashboard:end */