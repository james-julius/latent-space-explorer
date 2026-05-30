'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { HUD } from '@/components/HUD'
import type { Point, ModelStatus } from '@/lib/types'
import { pointColor } from '@/lib/colors'
import { projectToPositions, nearestNeighbors } from '@/lib/umap'
import {
  ollamaEmbed, isEmbedModelAvailable, pullModel, generateRelated,
} from '@/lib/ollama'
import { STABLE_THRESHOLD, placeNearNeighbors } from '@/lib/umap'

const Scene = dynamic(() => import('@/components/Scene').then(m => m.Scene), { ssr: false })

export default function Home() {
  const [points, setPoints] = useState<Point[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<ModelStatus>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [isExpanding, setIsExpanding] = useState(false)
  const [spread, setSpread] = useState(0.4)
  const [triggerRadius, setTriggerRadius] = useState(1.8)
  const [flyTarget, setFlyTarget] = useState<[number,number,number] | null>(null)
  const spreadRef = useRef(0.4)
  const colorIndex = useRef(0)
  const modelReady = useRef(false)
  const expandingRef = useRef(false)
  const pointsRef = useRef<Point[]>([])
  const selectedIdRef = useRef<string | null>(null)
  const expandedIdsRef = useRef<Set<string>>(new Set())
  pointsRef.current = points
  selectedIdRef.current = selectedId
  expandedIdsRef.current = expandedIds

  // Restore persisted points on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lse-points')
      if (raw) {
        const pts = JSON.parse(raw) as Point[]
        setPoints(pts)
        colorIndex.current = pts.length
      }
      const rawExp = localStorage.getItem('lse-expanded')
      if (rawExp) setExpandedIds(new Set(JSON.parse(rawExp) as string[]))
    } catch { /* ignore corrupt storage */ }
  }, [])

  // Persist points whenever they change (debounced)
  useEffect(() => {
    if (points.length === 0) return
    const t = setTimeout(() => {
      try { localStorage.setItem('lse-points', JSON.stringify(points)) } catch { /* quota */ }
    }, 800)
    return () => clearTimeout(t)
  }, [points])

  useEffect(() => {
    try {
      localStorage.setItem('lse-expanded', JSON.stringify([...expandedIds]))
    } catch { /* quota */ }
  }, [expandedIds])

  useEffect(() => {
    async function init() {
      setStatus('loading')
      try {
        const available = await isEmbedModelAvailable()
        if (!available) await pullModel(pct => setLoadProgress(pct))
        else setLoadProgress(100)
        modelReady.current = true
        setStatus('ready')
      } catch (e) {
        console.error('Ollama init error:', e)
        setStatus('error')
      }
    }
    init()
  }, [])

  // Embed a single text. Shows a placeholder dot immediately, replaces on arrival.
  // nearPos: where to cluster the placeholder (parent point position for expansions)
  const embedOne = useCallback(async (
    text: string,
    nearPos?: [number, number, number]
  ): Promise<Point> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const color = pointColor(colorIndex.current++)

    // Placeholder: tight cluster around parent so spinners don't travel far
    const jitter = (): number => (Math.random() - 0.5) * 0.12
    const placeholderPos: [number, number, number] = nearPos
      ? [nearPos[0] + jitter(), nearPos[1] + jitter(), nearPos[2] + jitter()]
      : [jitter(), jitter(), jitter()]

    setPoints(prev => [
      ...prev,
      { id, text, embedding: [], position: placeholderPos, color, isPending: true },
    ])

    // 2. Fetch embedding
    const embedding = await ollamaEmbed(text)
    const point: Point = { id, text, embedding, position: placeholderPos, color }

    // 3. Replace placeholder with real point at its proper position
    setPoints(prev => {
      const rest = prev.filter(p => p.id !== id)
      const realPoints = rest.filter(p => !p.isPending)
      const next = [...rest, point]

      if (next.filter(p => !p.isPending).length <= STABLE_THRESHOLD) {
        const eligible = next.filter(p => !p.isPending)
        const positions = projectToPositions(eligible)
        const positioned = eligible.map((p, i) => ({ ...p, position: positions[i] }))
        const pending = next.filter(p => p.isPending)
        return [...positioned, ...pending]
      } else {
        const pos = placeNearNeighbors(embedding, realPoints, spreadRef.current)
        return [...rest, { ...point, position: pos }]
      }
    })

    return point
  }, [])

  // Expand a point by ID — generates related concepts and embeds them
  const expandPoint = useCallback(async (pointId: string) => {
    if (expandingRef.current) return
    if (expandedIdsRef.current.has(pointId)) return
    const pt = pointsRef.current.find(p => p.id === pointId)
    if (!pt || !modelReady.current) return

    expandingRef.current = true
    setIsExpanding(true)
    setExpandedIds(prev => new Set(prev).add(pointId))
    try {
      const related = await generateRelated(pt.text)
      for (const term of related) {
        if (pointsRef.current.some(p => p.text.toLowerCase() === term.toLowerCase())) continue
        await embedOne(term, pt.position)  // cluster placeholders near parent
      }
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [embedOne])

  // Embed a term then auto-expand with LLM-generated related concepts
  const handleEmbed = useCallback(async (text: string) => {
    if (!modelReady.current || status !== 'ready') return
    setIsExpanding(true)
    expandingRef.current = true
    try {
      const pt = await embedOne(text)
      setFlyTarget(pt.position)
      setExpandedIds(prev => new Set(prev).add(pt.id))
      const related = await generateRelated(text)
      for (const term of related) {
        await embedOne(term)
      }
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [status, embedOne])

  // Load a preset without auto-expansion (already curated)
  const handleLoadPreset = useCallback(async (texts: string[]) => {
    if (!modelReady.current || status !== 'ready') return
    setPoints([])
    setSelectedId(null)
    colorIndex.current = 0
    for (const text of texts) {
      await embedOne(text)
    }
  }, [status, embedOne])

  const handleClear = useCallback(() => {
    setPoints([])
    setSelectedId(null)
    setExpandedIds(new Set())
    colorIndex.current = 0
    localStorage.removeItem('lse-points')
    localStorage.removeItem('lse-expanded')
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const pts = pointsRef.current
      const sel = selectedIdRef.current

      if (e.key === 'Escape') { setSelectedId(null); return }
      if (pts.length === 0) return

      if (e.key === 'Tab' || e.key === 'n') {
        e.preventDefault()
        if (sel) {
          const neighbors = nearestNeighbors(sel, pts, 1)
          if (neighbors.length > 0) setSelectedId(neighbors[0].id)
        } else {
          setSelectedId(pts[0].id)
        }
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const idx = pts.findIndex(p => p.id === sel)
        setSelectedId(pts[(idx + 1) % pts.length].id)
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = pts.findIndex(p => p.id === sel)
        setSelectedId(pts[(idx - 1 + pts.length) % pts.length].id)
        return
      }

      // F or X to manually expand the selected point
      if ((e.key === 'f' || e.key === 'x') && sel) {
        expandPoint(sel)
        return
      }

      const num = parseInt(e.key)
      if (num >= 1 && num <= 5) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('load-preset', { detail: num - 1 }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isExpanding, handleEmbed, expandPoint])

  const neighborIds = selectedId
    ? new Set(nearestNeighbors(selectedId, points, 5).map(p => p.id))
    : new Set<string>()

  return (
    <main className="fixed inset-0 overflow-hidden">
      <Scene
        points={points}
        selectedId={selectedId}
        neighborIds={neighborIds}
        expandedIds={expandedIds}
        triggerRadius={triggerRadius}
        flyTarget={flyTarget}
        onSelectPoint={setSelectedId}
        onExpandPoint={expandPoint}
      />
      <HUD
        status={status}
        loadProgress={loadProgress}
        isExpanding={isExpanding}
        spread={spread}
        triggerRadius={triggerRadius}
        points={points}
        selectedId={selectedId}
        onEmbed={handleEmbed}
        onLoadPreset={handleLoadPreset}
        onClear={handleClear}
        onSpreadChange={v => { setSpread(v); spreadRef.current = v }}
        onTriggerRadiusChange={setTriggerRadius}
      />
    </main>
  )
}
