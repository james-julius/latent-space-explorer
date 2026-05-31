'use client'

import { useEffect } from 'react'

interface Props {
  firstVisit: boolean
  onClose: () => void
}

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: '✷',
    title: 'Type a concept',
    body: 'Enter any word or phrase in the bar at the bottom. It gets embedded by a local model and dropped into 3D space — near things that mean something similar.',
  },
  {
    icon: '✦',
    title: 'Explore the cloud',
    body: 'Every glowing point is a concept. Distance is meaning: neighbours are related, far-apart points are unrelated. Click a point to inspect it and see its nearest neighbours.',
  },
  {
    icon: '➤',
    title: 'Fly through it',
    body: 'WASD to move, E / Q for up / down, drag to look around. Use the fly-speed slider (bottom-right) to go faster or slower. Press H to fly home.',
  },
  {
    icon: '⊕',
    title: 'Grow the space',
    body: 'With auto-expand on, getting close to a point spawns related concepts around it — so the map keeps unfolding as you wander. Try a preset on the left to start with a theme.',
  },
]

export function HelpOverlay({ firstVisit, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 sm:p-10"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-full overflow-y-auto rounded-2xl border border-white/12
          bg-gradient-to-b from-[#0d0d14]/95 to-[#070709]/95 shadow-2xl
          p-10 space-y-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-[10px] font-mono tracking-[0.3em] uppercase">LSE</span>
            <div className="h-px flex-1 bg-white/10" />
            <button
              onClick={onClose}
              className="-mr-1 text-white/35 hover:text-white/80 text-base leading-none transition-colors"
              aria-label="close"
            >
              ✕
            </button>
          </div>
          <h1 className="text-white text-lg font-mono tracking-tight leading-snug pr-2">
            {firstVisit ? 'Welcome to the Latent Space Explorer' : 'Latent Space Explorer'}
          </h1>
          <p className="text-white/55 text-[13px] leading-relaxed">
            A flythrough map of meaning. Concepts become points in 3D — the closer two points sit,
            the more an AI model thinks they mean the same thing. Fly around and watch ideas cluster.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-5">
          {STEPS.map(s => (
            <div key={s.title} className="flex gap-3.5">
              <span className="text-white/45 text-base leading-none mt-0.5 w-5 shrink-0 text-center">{s.icon}</span>
              <div className="space-y-1">
                <div className="text-white/90 text-[13px] font-mono">{s.title}</div>
                <div className="text-white/50 text-[12px] leading-relaxed">{s.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Shortcuts */}
        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-5 py-4">
          <div className="text-white/35 text-[9px] font-mono uppercase tracking-widest mb-2.5">shortcuts</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] font-mono text-white/55">
            <span><span className="text-white/85">wasd</span> · move</span>
            <span><span className="text-white/85">e / q</span> · up / down</span>
            <span><span className="text-white/85">drag</span> · look</span>
            <span><span className="text-white/85">shift</span> · warp speed</span>
            <span><span className="text-white/85">tab</span> · next neighbour</span>
            <span><span className="text-white/85">h</span> · fly home</span>
            <span><span className="text-white/85">/</span> · search</span>
            <span><span className="text-white/85">i</span> · import text</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onClose}
          className="w-full rounded-lg border border-white/15 bg-white/[0.06]
            hover:bg-white/[0.12] hover:border-white/25
            text-white/85 text-[13px] font-mono py-3 transition-colors"
        >
          {firstVisit ? 'Start exploring' : 'Got it'}
        </button>
      </div>
    </div>
  )
}
