'use client'

// ============================================================
// ARKZEN ENGINE — RICH TEXT EDITOR
// arkzen/core/components/RichTextEditor.tsx
//
// TipTap wrapper with a clean toolbar.
// install: npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
//
// Usage:
//   <RichTextEditor value={content} onChange={setContent} />
// ============================================================

import React                              from 'react'
import { useEditor, EditorContent }       from '@tiptap/react'
import StarterKit                         from '@tiptap/starter-kit'
import Placeholder                        from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Strikethrough, Code,
  Heading2, List, ListOrdered,
  Quote, Minus, Undo, Redo
} from 'lucide-react'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface RichTextEditorProps {
  value?:       string         // HTML string
  onChange?:    (html: string) => void
  placeholder?: string
  minHeight?:   string         // e.g. '200px'
  disabled?:    boolean
  className?:   string
  hideToolbar?: boolean
}

// ─────────────────────────────────────────────
// TOOLBAR BUTTON
// ─────────────────────────────────────────────

const ToolbarBtn: React.FC<{
  onClick:  () => void
  active?:  boolean
  disabled?: boolean
  children: React.ReactNode
  title?:   string
}> = ({ onClick, active, disabled, children, title }) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`
      p-1.5 rounded-lg transition-colors text-sm
      ${active
        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
    `}
  >
    {children}
  </button>
)

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value        = '',
  onChange,
  placeholder  = 'Write something...',
  minHeight    = '180px',
  disabled     = false,
  className    = '',
  hideToolbar  = false,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content:  value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className={`border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 ${className}`}>

      {/* Toolbar */}
      {!hideToolbar && (
        <div className="flex items-center gap-0.5 flex-wrap px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">

          <ToolbarBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
            <Italic size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
            <Strikethrough size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>
            <Code size={14} />
          </ToolbarBtn>

          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <ToolbarBtn title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
            <Heading2 size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
            <ListOrdered size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
            <Quote size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={14} />
          </ToolbarBtn>

          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

          <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo size={14} />
          </ToolbarBtn>
          <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo size={14} />
          </ToolbarBtn>
        </div>
      )}

      {/* Editor area */}
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className={`
          prose prose-sm dark:prose-invert max-w-none
          px-4 py-3
          focus:outline-none
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:min-h-[inherit]
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-neutral-400
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      />
    </div>
  )
}