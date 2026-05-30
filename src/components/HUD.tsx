'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import type { ModelStatus, Point } from '@/lib/types'
import { PRESETS } from '@/lib/presets'
import { nearestNeighbors } from '@/lib/umap'

interface HUDProps {
  status: ModelStatus
  loadProgress: number
  points: Point[]
  selectedId: string | null
  onEmbed: (text: string) => void
  onLoadPreset: (texts: string[]) => void
  onClear: () => void
}

export function HUD({
  status,
  loadProgress,
  points,
  selectedId,
  onEmbed,
  onLoadPreset,
  onClear,
}: HUDProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedPoint = points.find(p => p.id === selectedId)
  const neighbors = selectedPoint ? nearestNeighbors(selectedPoint.id, points, 5) : []

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && status === 'ready') {
      onEmbed(input.trim())
      setInput('')
    }
  }

  return (
    <>
      {/* Top status bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="text-white/40 text-xs font-mono tracking-widest uppercase">
            Latent Space Explorer
          </div>
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'ready' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' :
              status === 'loading' ? 'bg-amber-400 animate-pulse' :
              status === 'error' ? 'bg-red-400' :
              'bg-white/20'
            }`}
          />
          <div className="text-white/40 text-xs font-mono">
            {status === 'loading' ? `loading model ${Math.round(loadProgress)}%` :
             status === 'ready' ? `bge-small-en-v1.5 · ${points.length} point${points.length !== 1 ? 's' : ''}` :
             status === 'error' ? 'error loading model' : 'initialising'}
          </div>
        </div>

        {points.length > 0 && (
          <button
            onClick={onClear}
            className="pointer-events-auto text-white/30 hover:text-white/60 text-xs font-mono transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {/* Loading progress bar */}
      {status === 'loading' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-20">
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      )}

      {/* Left: Preset corpora */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
        {PRESETS.map(preset => (
          <button
            key={preset.name}
            onClick={() => onLoadPreset(preset.texts)}
            disabled={status !== 'ready'}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg
              bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
              text-white/50 hover:text-white/80 text-xs font-mono
              transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
              text-left"
          >
            <span>{preset.emoji}</span>
            <span>{preset.name}</span>
          </button>
        ))}
      </div>

      {/* Right: Selected point info */}
      {selectedPoint && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-64">
          <div className="bg-black/60 backdrop-blur border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                style={{ background: selectedPoint.color, boxShadow: `0 0 8px ${selectedPoint.color}` }}
              />
              <p className="text-white text-sm leading-snug">{selectedPoint.text}</p>
            </div>

            {neighbors.length > 0 && (
              <>
                <div className="border-t border-white/10" />
                <div>
                  <div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-2">
                    Nearest
                  </div>
                  <div className="space-y-1">
                    {neighbors.map(n => (
                      <div key={n.id} className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: n.color }}
                        />
                        <span className="text-white/60 text-xs truncate">{n.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-white/10 pt-1">
              <div className="text-white/20 text-xs font-mono">
                {selectedPoint.embedding.length}d embedding
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Text input */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              status === 'ready' ? 'type anything and press enter…' :
              status === 'loading' ? 'loading model…' : 'initialising…'
            }
            disabled={status !== 'ready'}
            className="w-full bg-black/60 backdrop-blur border border-white/20
              focus:border-white/40 rounded-full px-5 py-3 pr-12
              text-white placeholder-white/25 text-sm font-mono outline-none
              transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-xs font-mono">
            ↵
          </div>
        </div>
        <div className="text-center text-white/20 text-xs font-mono mt-2">
          click a point to inspect · drag to orbit · scroll to zoom
        </div>
      </div>
    </>
  )
}
