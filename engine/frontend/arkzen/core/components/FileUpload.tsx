'use client'

// ============================================================
// ARKZEN ENGINE — FILE UPLOAD
// arkzen/core/components/FileUpload.tsx
//
// react-dropzone wrapper with image preview, progress,
// and built-in upload to Laravel storage endpoint.
// install: npm install react-dropzone
//
// Usage:
//   <FileUpload
//     accept={{ 'image/*': ['.jpg', '.png', '.webp'] }}
//     uploadUrl="/api/upload"
//     onUploadComplete={(url) => setImagePath(url)}
//   />
// ============================================================

import React, { useState, useCallback } from 'react'
import { useDropzone }                  from 'react-dropzone'
import { motion, AnimatePresence }      from 'framer-motion'
import { Upload, X, CheckCircle, AlertCircle, Image, File } from 'lucide-react'
import { arkzenFetch }                  from '../stores/authStore'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface UploadedFile {
  file:     File
  preview?: string   // for images
  status:   'pending' | 'uploading' | 'done' | 'error'
  progress: number
  url?:     string   // returned from server
  error?:   string
}

interface FileUploadProps {
  accept?:           Record<string, string[]>
  multiple?:         boolean
  maxSize?:          number              // bytes, default 10MB
  uploadUrl?:        string              // Laravel endpoint, default /api/upload
  fieldName?:        string              // form field name, default 'file'
  onUploadComplete?: (url: string, file: File) => void
  onUploadError?:    (error: string, file: File) => void
  onFilesChange?:    (files: UploadedFile[]) => void
  className?:        string
  disabled?:         boolean
  label?:            string
  hint?:             string
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export const FileUpload: React.FC<FileUploadProps> = ({
  accept         = { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
  multiple       = false,
  maxSize        = 10 * 1024 * 1024,   // 10MB
  uploadUrl      = '/api/upload',
  fieldName      = 'file',
  onUploadComplete,
  onUploadError,
  onFilesChange,
  className      = '',
  disabled       = false,
  label          = 'Drop files here or click to browse',
  hint,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([])

  // ─── Upload a single file ────────────────────
  const uploadFile = useCallback(async (uploadedFile: UploadedFile, index: number) => {
    const formData = new FormData()
    formData.append(fieldName, uploadedFile.file)

    // Set uploading state
    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, status: 'uploading', progress: 0 } : f
    ))

    try {
      const res = await arkzenFetch(uploadUrl, { method: 'POST', body: formData })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error(errBody.message ?? `HTTP ${res.status}`)
      }

      const result = await res.json() as { url: string; path: string }
      const url    = result.url ?? result.path

      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'done', progress: 100, url } : f
      ))

      onUploadComplete?.(url, uploadedFile.file)
      onFilesChange?.(files)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'error', error: message } : f
      ))
      onUploadError?.(message, uploadedFile.file)
    }
  }, [uploadUrl, fieldName, onUploadComplete, onUploadError, files])

  // ─── Dropzone ────────────────────────────────
  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadedFile[] = accepted.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status:  'pending' as const,
      progress: 0,
    }))

    const startIndex = files.length
    const allFiles   = [...files, ...newFiles]
    setFiles(allFiles)
    onFilesChange?.(allFiles)

    // Auto upload each file
    if (uploadUrl) {
      newFiles.forEach((f, i) => uploadFile(f, startIndex + i))
    }
  }, [files, uploadUrl, uploadFile, onFilesChange])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize,
    disabled,
  })

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesChange?.(newFiles)
  }

  const isImage = (file: File) => file.type.startsWith('image/')

  return (
    <div className={`space-y-3 ${className}`}>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragActive
            ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="flex flex-col items-center gap-3"
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
            <Upload size={20} className={isDragActive ? 'text-white dark:text-neutral-900' : 'text-neutral-400'} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
            {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
            <p className="text-xs text-neutral-400 mt-1">
              Max size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        </motion.div>
      </div>

      {/* Rejections */}
      {fileRejections.length > 0 && (
        <p className="text-xs text-red-500">
          {fileRejections[0].errors[0].message}
        </p>
      )}

      {/* File list */}
      <AnimatePresence>
        {files.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            {/* Preview / icon */}
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              {f.preview
                ? <img src={f.preview} alt="" className="w-full h-full object-cover" />
                : isImage(f.file)
                  ? <Image size={18} className="text-neutral-400" />
                  : <File  size={18} className="text-neutral-400" />
              }
            </div>

            {/* Name + progress */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{f.file.name}</p>
              <p className="text-xs text-neutral-400">{(f.file.size / 1024).toFixed(0)} KB</p>
              {f.status === 'uploading' && (
                <div className="mt-1.5 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-neutral-900 dark:bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${f.progress}%` }}
                  />
                </div>
              )}
              {f.status === 'error' && (
                <p className="text-xs text-red-500 mt-0.5">{f.error}</p>
              )}
            </div>

            {/* Status icon */}
            <div className="flex-shrink-0">
              {f.status === 'done'      && <CheckCircle  size={16} className="text-emerald-500" />}
              {f.status === 'error'     && <AlertCircle  size={16} className="text-red-500" />}
              {f.status === 'uploading' && <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />}
            </div>

            {/* Remove */}
            {f.status !== 'uploading' && (
              <button onClick={() => removeFile(i)} className="flex-shrink-0 p-1 rounded-lg text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                <X size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}