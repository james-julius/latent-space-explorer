'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { HUD } from '@/components/HUD'
import { SearchOverlay } from '@/components/SearchOverlay'
import { ContextMenu, type ContextAction } from '@/components/ContextMenu'
import type { Point, ModelStatus, ContextMenuState } from '@/lib/types'
import { pointColor } from '@/lib/colors'
import { projectToPositions, nearestNeighbors, STABLE_THRESHOLD, placeNearNeighbors } from '@/lib/umap'
import { ollamaEmbed, isEmbedModelAvailable, pullModel, generateRelated } from '@/lib/ollama'
import { generateBridgeConcepts } from '@/lib/bridge'
import { kMeans, CLUSTER_COLORS } from '@/lib/clustering'

const Scene = dynamic(() => import('@/components/Scene').then(m => m.Scene), { ssr: false })

export default function Home() {
  // ── Core state ───────────────────────────────────────────────────────────────
  const [points, setPoints] = useState<Point[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // ── Model ────────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<ModelStatus>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [isExpanding, setIsExpanding] = useState(false)

  // ── Controls ─────────────────────────────────────────────────────────────────
  const [spread, setSpread] = useState(0.4)
  const [triggerRadius, setTriggerRadius] = useState(1.8)
  const [autoExpand, setAutoExpand] = useState(true)
  const [showLines, setShowLines] = useState(false)
  const [showClusters, setShowClusters] = useState(false)
  const [homeSignal, setHomeSignal] = useState(0)

  // ── Navigation ───────────────────────────────────────────────────────────────
  const [flyTarget, setFlyTarget] = useState<[number, number, number] | null>(null)
  const [visitHistory, setVisitHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [showSearch, setShowSearch] = useState(false)

  // ── Bridge mode ──────────────────────────────────────────────────────────────
  const [bridgeFrom, setBridgeFrom] = useState<string | null>(null)

  // ── Context menu ─────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // ── Undo ─────────────────────────────────────────────────────────────────────
  const undoStack = useRef<Point[][]>([])
  const undoExpandedStack = useRef<Set<string>[]>([])

  // ── Refs for stable callbacks ─────────────────────────────────────────────────
  const spreadRef         = useRef(0.4)
  const autoExpandRef     = useRef(true)
  const colorIndex        = useRef(0)
  const modelReady        = useRef(false)
  const expandingRef      = useRef(false)
  const pointsRef         = useRef<Point[]>([])
  const selectedIdRef     = useRef<string | null>(null)
  const expandedIdsRef    = useRef<Set<string>>(new Set())
  const bridgeFromRef     = useRef<string | null>(null)
  const visitHistoryRef   = useRef<string[]>([])
  const historyIdxRef     = useRef(-1)
  pointsRef.current       = points
  selectedIdRef.current   = selectedId
  expandedIdsRef.current  = expandedIds
  bridgeFromRef.current   = bridgeFrom
  visitHistoryRef.current = visitHistory
  historyIdxRef.current   = historyIdx
  autoExpandRef.current   = autoExpand

  // ── Persistence ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lse-points')
      if (raw) {
        const pts = JSON.parse(raw) as Point[]
        setPoints(pts.filter(p => !p.isPending)) // don't restore pending
        colorIndex.current = pts.length
      }
      const rawExp = localStorage.getItem('lse-expanded')
      if (rawExp) setExpandedIds(new Set(JSON.parse(rawExp) as string[]))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (points.length === 0) return
    const t = setTimeout(() => {
      try { localStorage.setItem('lse-points', JSON.stringify(points.filter(p => !p.isPending))) } catch { /* quota */ }
    }, 800)
    return () => clearTimeout(t)
  }, [points])

  useEffect(() => {
    try { localStorage.setItem('lse-expanded', JSON.stringify([...expandedIds])) } catch { /* quota */ }
  }, [expandedIds])

  // ── Ollama init ───────────────────────────────────────────────────────────────
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

  // ── Cluster colouring ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showClusters) {
      // Restore original colors
      setPoints(prev => prev.map(p => ({ ...p, color: p.baseColor ?? p.color })))
      return
    }
    const real = points.filter(p => !p.isPending && p.embedding.length > 0)
    if (real.length < 3) return
    const k = Math.min(8, Math.max(2, Math.floor(real.length / 5)))
    const labels = kMeans(real.map(p => p.embedding), k)
    setPoints(prev => prev.map(p => {
      const idx = real.findIndex(r => r.id === p.id)
      if (idx === -1) return p
      const clusterColor = CLUSTER_COLORS[labels[idx] % CLUSTER_COLORS.length]
      return { ...p, baseColor: p.baseColor ?? p.color, color: clusterColor }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showClusters])

  // ── Navigate to a point (with history) ────────────────────────────────────────
  const navigateTo = useCallback((id: string) => {
    setSelectedId(id)
    const pt = pointsRef.current.find(p => p.id === id)
    if (pt) setFlyTarget(pt.position)

    setVisitHistory(prev => {
      const trimmed = prev.slice(0, historyIdxRef.current + 1)
      const next = [...trimmed, id]
      setHistoryIdx(next.length - 1)
      return next
    })
  }, [])

  // ── Embed one concept ──────────────────────────────────────────────────────────
  const embedOne = useCallback(async (
    text: string,
    nearPos?: [number, number, number]
  ): Promise<Point> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const color = pointColor(colorIndex.current++)
    const jitter = (): number => (Math.random() - 0.5) * 0.12
    const placeholderPos: [number, number, number] = nearPos
      ? [nearPos[0] + jitter(), nearPos[1] + jitter(), nearPos[2] + jitter()]
      : [jitter(), jitter(), jitter()]

    setPoints(prev => [
      ...prev,
      { id, text, embedding: [], position: placeholderPos, color, isPending: true },
    ])

    const embedding = await ollamaEmbed(text)
    const point: Point = { id, text, embedding, position: placeholderPos, color }

    setPoints(prev => {
      const rest = prev.filter(p => p.id !== id)
      const realPoints = rest.filter(p => !p.isPending)
      const next = [...rest, point]

      if (next.filter(p => !p.isPending).length <= STABLE_THRESHOLD) {
        const eligible = next.filter(p => !p.isPending)
        const positions = projectToPositions(eligible)
        const positioned = eligible.map((p, i) => ({ ...p, position: positions[i] }))
        return [...positioned, ...next.filter(p => p.isPending)]
      } else {
        const pos = placeNearNeighbors(embedding, realPoints, spreadRef.current)
        return [...rest, { ...point, position: pos }]
      }
    })

    return point
  }, [])

  // ── Expand a point with related concepts ──────────────────────────────────────
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
        await embedOne(term, pt.position)
      }
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [embedOne])

  // ── Embed from input (with optional auto-expand) ──────────────────────────────
  const handleEmbed = useCallback(async (text: string) => {
    if (!modelReady.current || status !== 'ready') return

    // Push undo snapshot
    undoStack.current.push([...pointsRef.current])
    undoExpandedStack.current.push(new Set(expandedIdsRef.current))
    if (undoStack.current.length > 20) { undoStack.current.shift(); undoExpandedStack.current.shift() }

    setIsExpanding(true)
    expandingRef.current = true
    try {
      const pt = await embedOne(text)
      setFlyTarget(pt.position)
      setExpandedIds(prev => new Set(prev).add(pt.id))

      if (autoExpandRef.current) {
        const related = await generateRelated(text)
        for (const term of related) await embedOne(term)
      }
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [status, embedOne])

  // ── Load preset ───────────────────────────────────────────────────────────────
  const handleLoadPreset = useCallback(async (texts: string[]) => {
    if (!modelReady.current || status !== 'ready') return
    undoStack.current.push([...pointsRef.current])
    undoExpandedStack.current.push(new Set(expandedIdsRef.current))
    setPoints([])
    setSelectedId(null)
    colorIndex.current = 0
    for (const text of texts) await embedOne(text)
  }, [status, embedOne])

  // ── Bridge: find concepts between two points ──────────────────────────────────
  const handleBridge = useCallback(async (fromId: string, toId: string) => {
    const a = pointsRef.current.find(p => p.id === fromId)
    const b = pointsRef.current.find(p => p.id === toId)
    if (!a || !b) return
    setIsExpanding(true)
    expandingRef.current = true
    try {
      const concepts = await generateBridgeConcepts(a.text, b.text)
      for (const c of concepts) await embedOne(c, a.position)
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [embedOne])

  // ── Clear ─────────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setPoints([])
    setSelectedId(null)
    setExpandedIds(new Set())
    setBridgeFrom(null)
    setVisitHistory([])
    setHistoryIdx(-1)
    colorIndex.current = 0
    localStorage.removeItem('lse-points')
    localStorage.removeItem('lse-expanded')
  }, [])

  // ── Undo ──────────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const prev = undoStack.current.pop()!
    const prevExp = undoExpandedStack.current.pop()!
    setPoints(prev)
    setExpandedIds(prevExp)
    colorIndex.current = prev.length
  }, [])

  // ── Keyboard handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      // Search
      if (e.key === '/') { e.preventDefault(); setShowSearch(true); return }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); handleUndo(); return }

      // Home
      if (e.key === 'h') { setHomeSignal(s => s + 1); return }

      const pts = pointsRef.current
      const sel = selectedIdRef.current

      if (e.key === 'Escape') {
        if (bridgeFromRef.current) { setBridgeFrom(null); return }
        setSelectedId(null)
        return
      }
      if (pts.length === 0) return

      // Tab: nearest neighbour + auto-expand
      if (e.key === 'Tab') {
        e.preventDefault()
        if (sel) {
          const real = pts.filter(p => !p.isPending)
          const nb = nearestNeighbors(sel, real, 1)
          if (nb.length > 0) {
            navigateTo(nb[0].id)
            expandPoint(nb[0].id)
          }
        } else { navigateTo(pts.filter(p => !p.isPending)[0]?.id ?? pts[0].id) }
        return
      }

      // History navigation
      if (e.key === '[') {
        e.preventDefault()
        const idx = historyIdxRef.current
        const hist = visitHistoryRef.current
        if (idx > 0) { setHistoryIdx(idx - 1); setSelectedId(hist[idx - 1]) }
        return
      }
      if (e.key === ']') {
        e.preventDefault()
        const idx = historyIdxRef.current
        const hist = visitHistoryRef.current
        if (idx < hist.length - 1) { setHistoryIdx(idx + 1); setSelectedId(hist[idx + 1]) }
        return
      }

      // Bridge mode
      if (e.key === 'b') {
        if (sel) {
          if (bridgeFromRef.current && bridgeFromRef.current !== sel) {
            handleBridge(bridgeFromRef.current, sel)
            setBridgeFrom(null)
          } else {
            setBridgeFrom(sel)
          }
        }
        return
      }

      // Expand selected
      if ((e.key === 'f' || e.key === 'x') && sel) { expandPoint(sel); return }

      // Preset shortcuts
      const num = parseInt(e.key)
      if (num >= 1 && num <= 5) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('load-preset', { detail: num - 1 }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigateTo, expandPoint, handleBridge, handleUndo])

  // ── Context menu actions ──────────────────────────────────────────────────────
  const handleContextMenu = useCallback((pointId: string, x: number, y: number) => {
    setSelectedId(pointId)
    setContextMenu({ x, y, pointId })
  }, [])

  const contextActions: ContextAction[] = contextMenu ? [
    {
      label: 'Expand',
      icon: '✦',
      onClick: () => expandPoint(contextMenu.pointId),
      disabled: expandedIds.has(contextMenu.pointId),
    },
    {
      label: bridgeFrom ? 'Bridge to here' : 'Bridge from here',
      icon: '⇢',
      onClick: () => {
        if (bridgeFrom && bridgeFrom !== contextMenu.pointId) {
          handleBridge(bridgeFrom, contextMenu.pointId)
          setBridgeFrom(null)
        } else {
          setBridgeFrom(contextMenu.pointId)
        }
      },
    },
    {
      label: 'Copy text',
      icon: '⎘',
      onClick: () => {
        const pt = points.find(p => p.id === contextMenu.pointId)
        if (pt) navigator.clipboard.writeText(pt.text)
      },
    },
    {
      label: 'Delete',
      icon: '✕',
      onClick: () => {
        setPoints(prev => prev.filter(p => p.id !== contextMenu.pointId))
        if (selectedId === contextMenu.pointId) setSelectedId(null)
      },
    },
  ] : []

  const neighborIds = selectedId
    ? new Set(nearestNeighbors(selectedId, points.filter(p => !p.isPending), 5).map(p => p.id))
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
        showLines={showLines}
        homeSignal={homeSignal}
        onSelectPoint={id => { if (id) navigateTo(id); else setSelectedId(null) }}
        onExpandPoint={expandPoint}
        onContextMenu={handleContextMenu}
      />
      <HUD
        status={status}
        loadProgress={loadProgress}
        isExpanding={isExpanding}
        spread={spread}
        triggerRadius={triggerRadius}
        autoExpand={autoExpand}
        showLines={showLines}
        showClusters={showClusters}
        bridgeFrom={bridgeFrom ? points.find(p => p.id === bridgeFrom)?.text ?? null : null}
        points={points}
        selectedId={selectedId}
        visitHistory={visitHistory}
        historyIdx={historyIdx}
        onEmbed={handleEmbed}
        onLoadPreset={handleLoadPreset}
        onClear={handleClear}
        onUndo={handleUndo}
        onSpreadChange={v => { setSpread(v); spreadRef.current = v }}
        onTriggerRadiusChange={setTriggerRadius}
        onToggleAutoExpand={() => setAutoExpand(v => { autoExpandRef.current = !v; return !v })}
        onToggleLines={() => setShowLines(v => !v)}
        onToggleClusters={() => setShowClusters(v => !v)}
        onGoHome={() => setHomeSignal(s => s + 1)}
        onCancelBridge={() => setBridgeFrom(null)}
        onSearch={() => setShowSearch(true)}
        onNavigate={navigateTo}
      />
      {showSearch && (
        <SearchOverlay
          points={points.filter(p => !p.isPending)}
          onSelect={id => { navigateTo(id); expandPoint(id) }}
          onClose={() => setShowSearch(false)}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={contextActions}
          onClose={() => setContextMenu(null)}
        />
      )}
    </main>
  )
}
