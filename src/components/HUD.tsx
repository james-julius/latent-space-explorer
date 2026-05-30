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

// Flat toggle — diamond indicator, no borders or backgrounds
function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-mono transition-colors text-left ${
        active ? 'text-white/80' : 'text-white/20 hover:text-white/45'
      }`}
    >
      <span className={`mr-1.5 ${active ? 'text-white/60' : 'text-white/15'}`}>{active ? '◆' : '◇'}</span>
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

  const statusDot =
    status === 'ready'   ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' :
    status === 'loading' ? 'bg-amber-400 animate-pulse' :
    status === 'error'   ? 'bg-red-400' : 'bg-white/15'

  const modeLabel =
    gpsFrom           ? `gps — click destination` :
    activePath.length ? `journey ${pathStep + 1} / ${activePath.length}` :
    bridgeFrom        ? `bridge — click destination` :
    dreamMode         ? `dreaming` :
    isExpanding       ? `expanding` : null

  return (
    <>
      {/* ── Loading progress (1px line at very top) ───────────────────────── */}
      {status === 'loading' && loadProgress > 0 && (
        <div className="absolute top-0 left-0 z-30 h-px bg-amber-400/50 transition-all duration-300"
          style={{ width: `${loadProgress}%` }} />
      )}

      {/* ── Top bar — flush to top, very minimal ─────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 h-7
        flex items-center px-3 gap-3
        border-b border-white/[0.06] pointer-events-none">

        {/* Identity */}
        <span className="text-white/18 text-[9px] font-mono tracking-[0.25em] uppercase shrink-0">LSE</span>
        <div className={`w-[5px] h-[5px] rounded-full shrink-0 ${statusDot}`} />

        {/* Status / mode */}
        <span className={`text-[10px] font-mono truncate ${
          dreamMode ? 'text-violet-300/50' :
          modeLabel ? 'text-amber-300/60' : 'text-white/22'
        }`}>
          {status === 'loading'
            ? loadProgress > 0 ? `${loadProgress}%` : 'connecting'
            : status === 'error' ? 'ollama not found'
            : modeLabel ?? `${real.length} pts`}
        </span>

        {/* Cancel buttons for active modes */}
        <div className="ml-auto flex items-center gap-4 shrink-0 pointer-events-auto">
          {(activePath.length > 0 || gpsFrom) && (
            <button onClick={onCancelGPS}
              className="text-amber-300/40 hover:text-amber-300/70 text-[10px] font-mono transition-colors">
              stop
            </button>
          )}
          {bridgeFrom && (
            <button onClick={onCancelBridge}
              className="text-amber-300/40 hover:text-amber-300/70 text-[10px] font-mono transition-colors">
              stop
            </button>
          )}
          <button onClick={onImport}  className="text-white/18 hover:text-white/50 text-[10px] font-mono transition-colors">import</button>
          <button onClick={onSearch}  className="text-white/18 hover:text-white/50 text-[10px] font-mono transition-colors">search</button>
          <button onClick={onGoHome}  className="text-white/18 hover:text-white/50 text-[10px] font-mono transition-colors">home</button>
          {real.length > 0 && <>
            <button onClick={onUndo}  className="text-white/18 hover:text-white/50 text-[10px] font-mono transition-colors">undo</button>
            <button onClick={onClear} className="text-white/18 hover:text-white/50 text-[10px] font-mono transition-colors">clear</button>
          </>}
        </div>
      </div>

      {/* ── Left: presets — flush to left edge ───────────────────────────── */}
      <div className="absolute left-0 top-7 z-10 border-r border-white/[0.06]">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.name}
            onClick={() => onLoadPreset(preset.texts)}
            disabled={!canEmbed}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-left
              text-white/25 hover:text-white/60 hover:bg-white/[0.025]
              disabled:opacity-15 disabled:cursor-not-allowed
              transition-colors border-b border-white/[0.04] last:border-b-0"
          >
            <span className="text-white/12 text-[9px] font-mono w-2.5 shrink-0">{i + 1}</span>
            <span className="text-[10px] font-mono">{preset.name}</span>
          </button>
        ))}
      </div>

      {/* ── Right: selected point — flush to right edge ───────────────────── */}
      {selectedPoint && (
        <div className="absolute right-0 top-7 z-10 w-52
          border-l border-white/[0.06] flex flex-col"
          style={{ maxHeight: 'calc(100vh - 8.5rem)' }}>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2.5">

              {selectedPoint.source && (
                <div className="text-white/18 text-[9px] font-mono uppercase tracking-widest truncate">
                  {selectedPoint.source}
                </div>
              )}

              <div className="flex gap-2">
                {/* Thin color bar instead of dot */}
                <div className="w-[2px] shrink-0 self-stretch rounded-full"
                  style={{ background: selectedPoint.color, opacity: 0.7 }} />
                <div>
                  {selectedPoint.fullText ? (
                    <p className="text-white/65 text-[10px] leading-relaxed font-mono">
                      {selectedPoint.fullText}
                    </p>
                  ) : (
                    <p className="text-white/85 text-[11px] leading-snug font-mono">{selectedPoint.text}</p>
                  )}
                </div>
              </div>

              {neighbors.length > 0 && (
                <div className="pt-1 border-t border-white/[0.05]">
                  <div className="text-white/18 text-[9px] font-mono uppercase tracking-widest mb-1.5">
                    nearest
                  </div>
                  {neighbors.map(n => (
                    <button key={n.id} onClick={() => onNavigate(n.id)}
                      className="w-full flex items-center gap-1.5 py-0.5 text-left
                        text-white/35 hover:text-white/65 transition-colors">
                      <div className="w-[3px] h-[3px] rounded-full shrink-0"
                        style={{ background: n.color }} />
                      <span className="text-[10px] font-mono truncate">{n.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-3 py-1.5 border-t border-white/[0.05] flex items-center justify-between shrink-0">
            <span className="text-white/12 text-[9px] font-mono">{selectedPoint.embedding.length}d</span>
            <div className="flex gap-2.5">
              {historyIdx > 0 && <span className="text-white/15 text-[9px] font-mono">← back</span>}
              {historyIdx < visitHistory.length - 1 && <span className="text-white/15 text-[9px] font-mono">fwd →</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom-left: minimap — flush to corner ────────────────────────── */}
      <div className="absolute bottom-9 left-0 z-10 border-t border-r border-white/[0.06]">
        <Minimap points={points} />
      </div>

      {/* ── Bottom-right: world controls — flush to corner ───────────────── */}
      <div className="absolute bottom-9 right-0 z-10 w-52
        border-t border-l border-white/[0.06]
        bg-gradient-to-br from-black/40 to-transparent">
        <div className="p-3 space-y-2.5">

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <Toggle label="auto-expand" active={autoExpand}   onClick={onToggleAutoExpand} />
            <Toggle label="dream"       active={dreamMode}    onClick={onToggleDream} />
            <Toggle label="lines"       active={showLines}    onClick={onToggleLines} />
            <Toggle label="clusters"    active={showClusters} onClick={onToggleClusters} />
          </div>

          <div className="border-t border-white/[0.05] pt-2 space-y-1.5">
            {/* Spread */}
            <div className="flex items-center gap-2">
              <span className="text-white/18 text-[9px] font-mono w-10 shrink-0">spread</span>
              <input type="range" min="0.1" max="2.0" step="0.1" value={spread}
                onChange={e => onSpreadChange(parseFloat(e.target.value))}
                className="flex-1 cursor-pointer" style={{ accentColor: 'rgba(255,255,255,0.3)', height: '2px' }} />
              <span className="text-white/18 text-[9px] font-mono w-5 text-right shrink-0">{spread.toFixed(1)}</span>
            </div>
            {/* Radius */}
            <div className="flex items-center gap-2">
              <span className="text-white/18 text-[9px] font-mono w-10 shrink-0">radius</span>
              <input type="range" min="0.5" max="5.0" step="0.25" value={triggerRadius}
                onChange={e => onTriggerRadiusChange(parseFloat(e.target.value))}
                className="flex-1 cursor-pointer" style={{ accentColor: 'rgba(255,255,255,0.3)', height: '2px' }} />
              <span className="text-white/18 text-[9px] font-mono w-5 text-right shrink-0">{triggerRadius.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: input — flush to bottom edge ─────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-9
        flex items-center border-t border-white/[0.06]
        bg-gradient-to-t from-black/75 to-transparent pointer-events-none">
        <div className="w-full max-w-md mx-auto px-4 pointer-events-auto relative">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              bridgeFrom || gpsFrom ? 'click a point in the space…' :
              isExpanding ? 'expanding…' :
              status === 'ready' ? 'type a concept' :
              status === 'loading' ? 'loading…' : 'connecting…'
            }
            disabled={!canEmbed || !!bridgeFrom || !!gpsFrom}
            className="w-full bg-transparent border-0 outline-none
              text-white/75 placeholder-white/15 text-[11px] font-mono
              disabled:opacity-25 disabled:cursor-not-allowed py-0"
          />
          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 text-[9px] font-mono">↵</span>
        </div>
      </div>

      {/* ── Hint line at very bottom ──────────────────────────────────────── */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-0
        text-white/[0.08] text-[8px] font-mono tracking-wide pb-0.5 whitespace-nowrap pointer-events-none"
        style={{ bottom: '-1px' }}>
        wasd · e/q · tab · g gps · d dream · i import · / search · h home
      </div>
    </>
  )
}
