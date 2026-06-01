'use client'

import { useEffect, useState } from 'react'
import { KNOWLEDGE_PROVIDERS } from '@/lib/providers/registry'
import { getKey, setKey } from '@/lib/providers/keys'
import type { KnowledgeProviderId } from '@/lib/providers/types'

interface Props {
  knowledgeId: KnowledgeProviderId
  onKnowledgeChange: (id: KnowledgeProviderId) => void
  onKeysChanged: () => void
  embeddingModel: string
  onClose: () => void
}

export function SettingsOverlay({
  knowledgeId, onKnowledgeChange, onKeysChanged, embeddingModel, onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Draft key values, seeded from storage.
  const [keys, setKeys] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const p of KNOWLEDGE_PROVIDERS) if (p.requiresKey) init[p.id] = getKey(p.id) ?? ''
    return init
  })
  const [saved, setSaved] = useState<string | null>(null)

  const saveKey = (id: KnowledgeProviderId) => {
    setKey(id, keys[id]?.trim() ?? '')
    onKeysChanged()
    setSaved(id)
    setTimeout(() => setSaved(s => (s === id ? null : s)), 1500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 sm:p-10"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-full overflow-y-auto rounded-2xl border border-white/12
          bg-gradient-to-b from-[#0d0d14]/95 to-[#070709]/95 shadow-2xl p-10 space-y-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-[10px] font-mono tracking-[0.3em] uppercase">settings</span>
          <div className="h-px flex-1 bg-white/10" />
          <button
            onClick={onClose}
            className="-mr-1 text-white/35 hover:text-white/80 text-base leading-none transition-colors"
            aria-label="close"
          >✕</button>
        </div>

        {/* Embedding space */}
        <div className="space-y-2">
          <div className="text-white/35 text-[9px] font-mono uppercase tracking-widest">embedding space</div>
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3 text-[12px] font-mono text-white/60">
            <span className="text-white/85">{embeddingModel}</span> · runs in your browser, free, no key.
            Points you add are placed in this space.
          </div>
        </div>

        {/* Knowledge model */}
        <div className="space-y-3">
          <div className="text-white/35 text-[9px] font-mono uppercase tracking-widest">knowledge model</div>
          <p className="text-white/45 text-[11px] leading-relaxed">
            Which model surfaces related concepts when you expand a point. Switch models to compare
            how each one connects ideas — points are coloured by their source.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {KNOWLEDGE_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => onKnowledgeChange(p.id)}
                className={`rounded-lg border px-3 py-2 text-[12px] font-mono text-left transition-colors ${
                  knowledgeId === p.id
                    ? 'border-white/30 bg-white/[0.10] text-white/90'
                    : 'border-white/8 bg-white/[0.02] text-white/55 hover:bg-white/[0.06]'
                }`}
              >
                {p.label}
                {p.requiresKey && !getKey(p.id) && (
                  <span className="block text-[9px] text-amber-300/70 mt-0.5">needs key</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* API keys */}
        <div className="space-y-4">
          <div className="text-white/35 text-[9px] font-mono uppercase tracking-widest">api keys (bring your own)</div>
          <p className="text-white/45 text-[11px] leading-relaxed">
            Stored only in this browser and sent only to that provider. Never uploaded anywhere else.
          </p>
          {KNOWLEDGE_PROVIDERS.filter(p => p.requiresKey).map(p => (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-[12px] font-mono">{p.label}</span>
                {p.keyHelpUrl && (
                  <a
                    href={p.keyHelpUrl} target="_blank" rel="noreferrer"
                    className="text-white/30 hover:text-white/60 text-[10px] font-mono transition-colors"
                  >get key ↗</a>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={keys[p.id] ?? ''}
                  onChange={e => setKeys(k => ({ ...k, [p.id]: e.target.value }))}
                  placeholder={`${p.label} API key`}
                  className="flex-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2
                    text-[12px] font-mono text-white/80 placeholder-white/25 outline-none
                    focus:border-white/25"
                />
                <button
                  onClick={() => saveKey(p.id)}
                  className="rounded-md border border-white/15 bg-white/[0.06] hover:bg-white/[0.12]
                    text-white/80 text-[11px] font-mono px-3 transition-colors"
                >{saved === p.id ? 'saved' : 'save'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
