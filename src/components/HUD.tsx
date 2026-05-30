'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import type { ModelStatus, Point } from '@/lib/types'
import { PRESETS } from '@/lib/presets'
import { nearestNeighbors } from '@/lib/umap'
import { Minimap } from './Minimap'

interface HUDProps {
  status: ModelStatus
  loadProgress: number
  isExpanding: boolean
  spread: number
  triggerRadius: number
  autoExpand: boolean
  dreamMode: boolean
  showLines: boolean
  showClusters: boolean
  bridgeFrom: string | null
  gpsFrom: string | null
  activePath: string[]
  pathStep: number
  points: Point[]
  selectedId: string | null
  visitHistory: string[]
  historyIdx: number
  onEmbed: (text: string) => Promise<void>
  onLoadPreset: (texts: string[]) => Promise<void>
  onClear: () => void
  onUndo: () => void
  onSpreadChange: (v: number) => void
  onTriggerRadiusChange: (v: number) => void
  onToggleAutoExpand: () => void
  onToggleDream: () => void
  onToggleLines: () => void
  onToggleClusters: () => void
  onGoHome: () => void
  onCancelBridge: () => void
  onCancelGPS: () => void
  onSearch: () => void
  onImport: () => void
  onNavigate: (id: string) => void
}

function ToggleBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-mono transition-all border ${
        active
          ? 'bg-white/15 border-white/30 text-white'
          : 'bg-white/3 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
      }`}
    >
      {label}
    </button>
  )
}

export function HUD({
  status, loadProgress, isExpanding,
  spread, triggerRadius, autoExpand, dreamMode, showLines, showClusters,
  bridgeFrom, gpsFrom, activePath, pathStep,
  points, selectedId, visitHistory, historyIdx,
  onEmbed, onLoadPreset, onClear, onUndo,
  onSpreadChange, onTriggerRadiusChange,
  onToggleAutoExpand, onToggleDream, onToggleLines, onToggleClusters,
  onGoHome, onCancelBridge, onCancelGPS, onSearch, onImport, onNavigate,
}: HUDProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const real = points.filter(p => !p.isPending)
  const selectedPoint = real.find(p => p.id === selectedId)
  const neighbors = selectedPoint ? nearestNeighbors(selectedPoint.id, real, 5) : []
  const canEmbed = status === 'ready' && !isExpanding

  useEffect(() => {
    const handler = (e: Event) => {
      const idx = (e as CustomEvent<number>).detail
      if (PRESETS[idx] && canEmbed) onLoadPreset(PRESETS[idx].texts)
    }
    window.addEventListener('load-preset', handler)
    return () => window.removeEventListener('load-preset', handler)
  }, [canEmbed, onLoadPreset])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && canEmbed) {
      onEmbed(input.trim())
      setInput('')
    }
  }

  return (
    <>
      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs font-mono tracking-widest uppercase">LSE</span>
          <div className={`w-1.5 h-1.5 rounded-full ${
            status === 'ready' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' :
            status === 'loading' ? 'bg-amber-400 animate-pulse' :
            status === 'error' ? 'bg-red-400' : 'bg-white/20'
          }`} />
          <span className="text-white/30 text-xs font-mono">
            {status === 'loading'
              ? loadProgress > 0 ? `pulling model ${loadProgress}%` : 'connecting…'
              : status === 'error' ? 'ollama error'
              : isExpanding ? `expanding… ${real.length} pts`
              : bridgeFrom ? `bridging from "${bridgeFrom}" — select target`
              : `${real.length} pt${real.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {bridgeFrom && (
            <button onClick={onCancelBridge} className="text-amber-400/70 hover:text-amber-400 text-xs font-mono transition-colors">
              cancel bridge
            </button>
          )}
          <button onClick={onSearch} className="text-white/25 hover:text-white/60 text-xs font-mono transition-colors">
            / search
          </button>
          <button onClick={onGoHome} className="text-white/25 hover:text-white/60 text-xs font-mono transition-colors">
            H home
          </button>
          {points.length > 0 && (
            <>
              <button onClick={onUndo} className="text-white/25 hover:text-white/60 text-xs font-mono transition-colors">
                undo
              </button>
              <button onClick={onClear} className="text-white/25 hover:text-white/60 text-xs font-mono transition-colors">
                clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status === 'loading' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-20">
          <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${loadProgress}%` }} />
        </div>
      )}

      {/* ── Left panel: presets ──────────────────────────────────────────── */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.name}
            onClick={() => onLoadPreset(preset.texts)}
            disabled={!canEmbed}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
              bg-black/50 backdrop-blur border border-white/10 hover:border-white/20
              text-white/45 hover:text-white/75 text-xs font-mono
              transition-all disabled:opacity-25 disabled:cursor-not-allowed text-left"
          >
            <span>{preset.emoji}</span>
            <span>{preset.name}</span>
            <span className="text-white/15 ml-auto">{i + 1}</span>
          </button>
        ))}
      </div>

      {/* ── Right panel: selected point ──────────────────────────────────── */}
      {selectedPoint && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-56">
          <div className="bg-black/70 backdrop-blur border border-white/10 rounded-xl p-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <div
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ background: selectedPoint.color, boxShadow: `0 0 6px ${selectedPoint.color}` }}
              />
              <p className="text-white text-sm leading-snug">{selectedPoint.text}</p>
            </div>

            {neighbors.length > 0 && (
              <>
                <div className="border-t border-white/8" />
                <div>
                  <div className="text-white/25 text-xs font-mono uppercase tracking-widest mb-1.5">Nearest</div>
                  <div className="space-y-1">
                    {neighbors.map(n => (
                      <button
                        key={n.id}
                        onClick={() => onNavigate(n.id)}
                        className="w-full flex items-center gap-2 hover:bg-white/5 rounded px-1 py-0.5 transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: n.color }} />
                        <span className="text-white/55 text-xs truncate text-left">{n.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-white/8 pt-1 flex items-center justify-between">
              <span className="text-white/20 text-xs font-mono">{selectedPoint.embedding.length}d</span>
              <div className="flex items-center gap-1">
                {historyIdx > 0 && (
                  <span className="text-white/20 text-xs font-mono">[ back</span>
                )}
                {historyIdx < visitHistory.length - 1 && (
                  <span className="text-white/20 text-xs font-mono">] fwd</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom-left: minimap ─────────────────────────────────────────── */}
      <div className="absolute bottom-20 left-3 z-10">
        <Minimap points={points} />
      </div>

      {/* ── Bottom-right: world controls ─────────────────────────────────── */}
      <div className="absolute bottom-20 right-3 z-10 w-48">
        <div className="bg-black/60 backdrop-blur border border-white/10 rounded-xl p-3 space-y-3">
          {/* Toggle row */}
          <div className="flex flex-wrap gap-1.5">
            <ToggleBtn label="auto-expand" active={autoExpand} onClick={onToggleAutoExpand} />
            <ToggleBtn label="lines" active={showLines} onClick={onToggleLines} />
            <ToggleBtn label="clusters" active={showClusters} onClick={onToggleClusters} />
          </div>

          <div className="border-t border-white/8" />

          {/* Spread slider */}
          <div>
            <div className="flex justify-between text-white/25 text-xs font-mono mb-1">
              <span>spread</span><span>{spread.toFixed(1)}</span>
            </div>
            <input type="range" min="0.1" max="2.0" step="0.1" value={spread}
              onChange={e => onSpreadChange(parseFloat(e.target.value))}
              className="w-full accent-white/40 cursor-pointer" />
          </div>

          {/* Trigger radius slider */}
          <div>
            <div className="flex justify-between text-white/25 text-xs font-mono mb-1">
              <span>expand radius</span><span>{triggerRadius.toFixed(1)}</span>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.25" value={triggerRadius}
              onChange={e => onTriggerRadiusChange(parseFloat(e.target.value))}
              className="w-full accent-white/40 cursor-pointer" />
          </div>
        </div>
      </div>

      {/* ── Bottom center: input ─────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm px-4">
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              bridgeFrom ? `bridge from "${bridgeFrom.slice(0,20)}"… click a point` :
              isExpanding ? 'expanding…' :
              status === 'ready' ? 'type a concept…' :
              status === 'loading' ? 'loading…' : 'initialising…'
            }
            disabled={!canEmbed || !!bridgeFrom}
            className="w-full bg-black/65 backdrop-blur border border-white/15
              focus:border-white/35 rounded-full px-5 py-2.5 pr-10
              text-white placeholder-white/20 text-sm font-mono outline-none
              transition-all disabled:opacity-35 disabled:cursor-not-allowed"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/15 text-xs font-mono">↵</span>
        </div>
        <div className="text-center text-white/15 text-xs font-mono mt-1.5">
          wasd · e/q · shift=fast · tab neighbor · b bridge · / search · h home
        </div>
      </div>
    </>
  )
}
