'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import { chunkText, readFileAsText, type Chunk } from '@/lib/documents'

interface Props {
  onImport: (chunks: Chunk[]) => void
  onClose: () => void
}

export function ImportOverlay({ onImport, onClose }: Props) {
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle')
  const [chunkCount, setChunkCount] = useState(0)
  const [pasteText, setPasteText] = useState('')
  const [sourceName, setSourceName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const process = useCallback(async (text: string, name: string) => {
    setStatus('processing')
    const chunks = chunkText(text, name || 'document')
    setChunkCount(chunks.length)
    setStatus('done')
    setTimeout(() => { onImport(chunks); onClose() }, 600)
  }, [onImport, onClose])

  const handleFile = useCallback(async (file: File) => {
    const text = await readFileAsText(file)
    const name = file.name.replace(/\.[^/.]+$/, '')
    setSourceName(name)
    await process(text, name)
  }, [process])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) return
    process(pasteText, sourceName || 'pasted text')
  }, [pasteText, sourceName, process])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-black/90 border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-white text-sm font-mono font-semibold">Import document</h2>
            <p className="text-white/35 text-xs font-mono mt-0.5">
              chunks into ~150-word passages · each becomes a point in the space
            </p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-lg transition-colors">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging ? 'border-white/40 bg-white/5' : 'border-white/15 hover:border-white/25 hover:bg-white/3'
            }`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".txt,.md,.markdown" className="hidden" onChange={onFileChange} />
            {status === 'processing' ? (
              <p className="text-amber-400/70 text-sm font-mono animate-pulse">chunking…</p>
            ) : status === 'done' ? (
              <p className="text-emerald-400/70 text-sm font-mono">{chunkCount} passages ready</p>
            ) : (
              <>
                <p className="text-white/40 text-sm font-mono">drop .txt or .md here</p>
                <p className="text-white/20 text-xs font-mono mt-1">or click to browse</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-xs font-mono">or paste text</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Paste zone */}
          <div className="space-y-2">
            <input
              type="text"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="source name (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs font-mono outline-none focus:border-white/25 placeholder-white/20"
            />
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="paste your text here…"
              rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs font-mono outline-none focus:border-white/25 placeholder-white/20 resize-none"
            />
            <button
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim() || status === 'processing'}
              className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15
                text-white/70 hover:text-white text-xs font-mono transition-all
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              import text
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
