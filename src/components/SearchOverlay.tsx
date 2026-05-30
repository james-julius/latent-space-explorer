'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import type { Point } from '@/lib/types'

interface Props {
  points: Point[]
  onSelect: (id: string) => void
  onClose: () => void
}

export function SearchOverlay({ points, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = query.trim()
    ? points
        .filter(p => !p.isPending && p.text.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : []

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-black/90 backdrop-blur border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <span className="text-white/30 text-sm font-mono">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="search concepts…"
            className="flex-1 bg-transparent text-white text-sm font-mono outline-none placeholder-white/20"
          />
          <span className="text-white/20 text-xs font-mono">esc</span>
        </div>

        {results.length > 0 && (
          <ul className="py-1">
            {results.map(pt => (
              <li key={pt.id}>
                <button
                  onClick={() => { onSelect(pt.id); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: pt.color, boxShadow: `0 0 6px ${pt.color}` }}
                  />
                  <span className="text-white/80 text-sm font-mono">{pt.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim() && results.length === 0 && (
          <div className="px-4 py-3 text-white/25 text-sm font-mono">no matches</div>
        )}
      </div>
    </div>
  )
}
