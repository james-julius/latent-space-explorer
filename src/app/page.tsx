'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { HUD } from '@/components/HUD'
import { SearchOverlay } from '@/components/SearchOverlay'
import { ContextMenu, type ContextAction } from '@/components/ContextMenu'
import { EmbedFeed } from '@/components/EmbedFeed'
import { ImportOverlay } from '@/components/ImportOverlay'
import { HelpOverlay } from '@/components/HelpOverlay'
import { SettingsOverlay } from '@/components/SettingsOverlay'
import type { Point, ModelStatus, ContextMenuState, PointOrigin, ColorBy } from '@/lib/types'
import { pointColor, originColor } from '@/lib/colors'
import { projectToPositions, nearestNeighbors, STABLE_THRESHOLD, placeNearNeighbors } from '@/lib/umap'
import { embedClient } from '@/lib/embedClient'
import { browserBgeProvider } from '@/lib/providers/embed/worker'
import { loadScene, DEFAULT_SCENE, ACTIVE_EMBEDDING_MODEL, ACTIVE_DIM } from '@/lib/scenes'
import { serializeGraph, downloadGraph, type PersonalGraph } from '@/lib/graph'
import { getKnowledgeProvider, getKnowledgeDescriptor } from '@/lib/providers/registry'
import { getKey } from '@/lib/providers/keys'
import type { KnowledgeProviderId } from '@/lib/providers/types'
import { kMeans, CLUSTER_COLORS } from '@/lib/clustering'
import { type Chunk } from '@/lib/documents'
import { liveCamera } from '@/lib/cameraState'

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
  const [flySpeed, setFlySpeed] = useState(1.6)
  const [autoExpand, setAutoExpand] = useState(true)
  const [showLines, setShowLines] = useState(false)
  const [colorBy, setColorBy] = useState<ColorBy>('default')
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

  // ── Dream mode ────────────────────────────────────────────────────────────────
  const [dreamMode, setDreamMode] = useState(false)

  // ── GPS / Narrative path ──────────────────────────────────────────────────────
  const [gpsFrom, setGpsFrom] = useState<string | null>(null)
  const [activePath, setActivePath] = useState<string[]>([])
  const [pathStep, setPathStep] = useState(-1)
  const gpsFromRef = useRef<string | null>(null)
  const activePathRef = useRef<string[]>([])
  gpsFromRef.current = gpsFrom
  activePathRef.current = activePath

  // ── Import ────────────────────────────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false)

  // ── Settings / knowledge provider ─────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false)
  const [knowledgeId, setKnowledgeId] = useState<KnowledgeProviderId>('ollama')
  const [keyVersion, setKeyVersion] = useState(0) // bump to rebuild provider after key edits
  const [providerError, setProviderError] = useState<string | null>(null)
  const knowledgeProvider = useMemo(
    () => getKnowledgeProvider(knowledgeId, getKey(knowledgeId)),
    [knowledgeId, keyVersion],
  )
  const knowledgeProviderRef = useRef(knowledgeProvider)
  knowledgeProviderRef.current = knowledgeProvider
  const knowledgeOriginRef = useRef(getKnowledgeDescriptor(knowledgeId).origin)
  knowledgeOriginRef.current = getKnowledgeDescriptor(knowledgeId).origin

  const reportProviderError = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('knowledge provider error:', msg)
    setProviderError(msg)
  }, [])
  const safeExpand = useCallback(async (term: string): Promise<string[]> => {
    try { return await knowledgeProviderRef.current.expand(term) }
    catch (e) { reportProviderError(e); return [] }
  }, [reportProviderError])
  const safeBridge = useCallback(async (a: string, b: string): Promise<string[]> => {
    try { return await knowledgeProviderRef.current.bridge(a, b) }
    catch (e) { reportProviderError(e); return [] }
  }, [reportProviderError])

  useEffect(() => {
    if (!providerError) return
    const t = setTimeout(() => setProviderError(null), 5000)
    return () => clearTimeout(t)
  }, [providerError])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lse-knowledge-provider') as KnowledgeProviderId | null
      if (saved) setKnowledgeId(saved)
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('lse-knowledge-provider', knowledgeId) } catch { /* ignore */ }
  }, [knowledgeId])

  // ── Help / welcome ────────────────────────────────────────────────────────────
  const [showHelp, setShowHelp] = useState(false)
  const [firstVisit, setFirstVisit] = useState(false)


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

  // ── Boot: load pre-seeded scene + restore the user's grown additions ──────────
  // Only the user-added delta (origin !== 'preset') is persisted to localStorage;
  // the seed cloud is re-fetched each load. Keeps storage small and dodges quota.
  const [sceneReady, setSceneReady] = useState(false)
  const [legacyPoints, setLegacyPoints] = useState<Point[] | null>(null)
  const sceneIdRef = useRef<string>(DEFAULT_SCENE)
  const sceneModelRef = useRef<string>(ACTIVE_EMBEDDING_MODEL)
  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        const rawExp = localStorage.getItem('lse-expanded')
        if (rawExp) setExpandedIds(new Set(JSON.parse(rawExp) as string[]))
      } catch { /* ignore */ }

      let sceneId = DEFAULT_SCENE
      try { sceneId = localStorage.getItem('lse-scene') || DEFAULT_SCENE } catch { /* ignore */ }
      sceneIdRef.current = sceneId

      let seedPoints: Point[] = []
      try {
        const scene = await loadScene(sceneId)
        seedPoints = scene.points
        sceneModelRef.current = scene.embeddingModel
      } catch (e) { console.error('scene load failed:', e) }

      let userPoints: Point[] = []
      try {
        const raw = localStorage.getItem('lse-points')
        if (raw) userPoints = (JSON.parse(raw) as Point[]).filter(p => !p.isPending)
      } catch { /* ignore */ }

      if (cancelled) return

      // Guard the embedding space: saved points whose vectors are a different
      // dimension can't share a map (cosine math would be garbage). Hold them
      // aside and offer to re-embed or discard rather than mixing spaces.
      const foreign = userPoints.filter(p => p.embedding.length > 0 && p.embedding.length !== ACTIVE_DIM)
      const native = userPoints.filter(p => p.embedding.length === ACTIVE_DIM)
      if (foreign.length > 0) setLegacyPoints(foreign)

      const merged = [...seedPoints, ...native]
      setPoints(merged)
      colorIndex.current = merged.length
      try { localStorage.setItem('lse-scene', sceneId) } catch { /* ignore */ }
      setSceneReady(true)
    }
    boot()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!sceneReady) return
    const t = setTimeout(() => {
      try {
        const delta = points.filter(p => !p.isPending && p.origin !== 'preset')
        localStorage.setItem('lse-points', JSON.stringify(delta))
      } catch { /* quota */ }
    }, 800)
    return () => clearTimeout(t)
  }, [points, sceneReady])

  useEffect(() => {
    try { localStorage.setItem('lse-expanded', JSON.stringify([...expandedIds])) } catch { /* quota */ }
  }, [expandedIds])

  // ── First-visit welcome ───────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem('lse-welcomed')) {
        setFirstVisit(true)
        setShowHelp(true)
      }
    } catch { /* ignore */ }
  }, [])

  const closeHelp = useCallback(() => {
    setShowHelp(false)
    if (firstVisit) {
      try { localStorage.setItem('lse-welcomed', '1') } catch { /* quota */ }
      setFirstVisit(false)
    }
  }, [firstVisit])

  // ── Embedder init (in-browser bge-small worker) ───────────────────────────────
  const embedProvider = browserBgeProvider
  useEffect(() => {
    embedClient.warmup()
    return embedProvider.onStatus?.((s, p) => {
      setStatus(s)
      setLoadProgress(p)
      modelReady.current = s === 'ready'
    })
  }, [embedProvider])

  // ── Colour mode: default (golden) · origin (by model) · cluster (kMeans) ───────
  useEffect(() => {
    if (colorBy === 'default') {
      setPoints(prev => prev.map(p => ({ ...p, color: p.baseColor ?? p.color })))
      return
    }
    if (colorBy === 'origin') {
      setPoints(prev => prev.map(p => ({
        ...p, baseColor: p.baseColor ?? p.color, color: originColor(p.origin),
      })))
      return
    }
    // cluster
    const real = pointsRef.current.filter(p => !p.isPending && p.embedding.length > 0)
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
  }, [colorBy])

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
    nearPos?: [number, number, number],
    origin: PointOrigin = 'user'
  ): Promise<Point> => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const color = pointColor(colorIndex.current++)
    const jitter = (): number => (Math.random() - 0.5) * 0.12
    const placeholderPos: [number, number, number] = nearPos
      ? [nearPos[0] + jitter(), nearPos[1] + jitter(), nearPos[2] + jitter()]
      : [jitter(), jitter(), jitter()]

    setPoints(prev => [
      ...prev,
      { id, text, embedding: [], position: placeholderPos, color, isPending: true, origin },
    ])

    const embedding = await embedProvider.embed(text)
    const point: Point = { id, text, embedding, position: placeholderPos, color, origin }

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
  }, [embedProvider])

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
      const related = await safeExpand(pt.text)
      for (const term of related) {
        if (pointsRef.current.some(p => p.text.toLowerCase() === term.toLowerCase())) continue
        await embedOne(term, pt.position, knowledgeOriginRef.current)
      }
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [embedOne, safeExpand])

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
        const related = await safeExpand(text)
        for (const term of related) await embedOne(term, undefined, knowledgeOriginRef.current)
      }
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [status, embedOne, safeExpand])

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
      const concepts = await safeBridge(a.text, b.text)
      for (const c of concepts) await embedOne(c, a.position, knowledgeOriginRef.current)
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [embedOne, safeBridge])

  // ── Document import ───────────────────────────────────────────────────────────
  const handleImport = useCallback(async (chunks: Chunk[]) => {
    if (!modelReady.current || status !== 'ready') return
    undoStack.current.push([...pointsRef.current])
    undoExpandedStack.current.push(new Set(expandedIdsRef.current))

    // All chunks from the same doc share the same base hue (golden-ratio stepped from current index)
    const baseIdx = colorIndex.current
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const color = pointColor(baseIdx + i)
      const jitter = (): number => (Math.random() - 0.5) * 0.12
      const placeholderPos: [number, number, number] = [jitter(), jitter(), jitter()]

      setPoints(prev => [
        ...prev,
        { id, text: chunk.text, fullText: chunk.fullText, source: chunk.source,
          embedding: [], position: placeholderPos, color, isPending: true, origin: 'import' },
      ])

      const embedding = await embedProvider.embed(chunk.text)
      const point: Point = { id, text: chunk.text, fullText: chunk.fullText, source: chunk.source,
        embedding, position: placeholderPos, color, origin: 'import' }

      setPoints(prev => {
        const rest = prev.filter(p => p.id !== id)
        const realPoints = rest.filter(p => !p.isPending)
        if (realPoints.length < STABLE_THRESHOLD) {
          const eligible = [...realPoints, point]
          const positions = projectToPositions(eligible)
          const positioned = eligible.map((p, idx2) => ({ ...p, position: positions[idx2] }))
          return [...prev.filter(p => p.isPending && p.id !== id), ...positioned]
        }
        const pos = placeNearNeighbors(embedding, realPoints, spreadRef.current)
        return [...rest, { ...point, position: pos }]
      })
    }
    colorIndex.current = baseIdx + chunks.length
  }, [status, embedProvider])

  // ── GPS: narrative path between two points ────────────────────────────────────
  const handleGPS = useCallback(async (fromId: string, toId: string) => {
    const a = pointsRef.current.find(p => p.id === fromId)
    const b = pointsRef.current.find(p => p.id === toId)
    if (!a || !b) return
    setIsExpanding(true)
    expandingRef.current = true
    try {
      const concepts = await safeBridge(a.text, b.text)
      const waypointIds: string[] = []
      for (const c of concepts) {
        const pt = await embedOne(c, a.position, knowledgeOriginRef.current)
        waypointIds.push(pt.id)
      }
      const path = [fromId, ...waypointIds, toId]
      setActivePath(path)
      setPathStep(0)
    } finally {
      expandingRef.current = false
      setIsExpanding(false)
    }
  }, [embedOne, safeBridge])

  // ── GPS step-through ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (pathStep < 0 || activePath.length === 0) return
    if (pathStep >= activePath.length) {
      // Journey complete
      setActivePath([])
      setPathStep(-1)
      return
    }
    const id = activePath[pathStep]
    navigateTo(id)
    const timer = setTimeout(() => setPathStep(s => s + 1), 2500)
    return () => clearTimeout(timer)
  }, [pathStep, activePath, navigateTo])

  // ── Dream mode loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dreamMode) return
    const interval = setInterval(() => {
      if (expandingRef.current || !modelReady.current) return
      const pts = pointsRef.current.filter(p => !p.isPending && !expandedIdsRef.current.has(p.id))
      if (pts.length === 0) return
      const sinY = Math.sin(liveCamera.yaw)
      const cosY = Math.cos(liveCamera.yaw)
      const lookX = -sinY, lookZ = -cosY
      const best = pts
        .map(pt => {
          const dx = pt.position[0] - liveCamera.x
          const dz = pt.position[2] - liveCamera.z
          const dist = Math.sqrt(dx * dx + dz * dz) || 0.01
          const alignment = (dx / dist) * lookX + (dz / dist) * lookZ
          return { pt, score: (alignment + 1.2) / dist }
        })
        .sort((a, b) => b.score - a.score)[0]
      if (best) expandPoint(best.pt.id)
    }, 4000)
    return () => clearInterval(interval)
  }, [dreamMode, expandPoint])

  // ── Clear ─────────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    // Reset to the seed cloud: drop the user's additions, keep the preset scene.
    setPoints(prev => {
      const seed = prev.filter(p => p.origin === 'preset')
      colorIndex.current = seed.length
      return seed
    })
    setSelectedId(null)
    setExpandedIds(new Set())
    setBridgeFrom(null)
    setGpsFrom(null)
    setActivePath([])
    setPathStep(-1)
    setVisitHistory([])
    setHistoryIdx(-1)
    localStorage.removeItem('lse-points')
    localStorage.removeItem('lse-expanded')
  }, [])

  // ── Export / import a personal grown graph ────────────────────────────────────
  const handleExport = useCallback(() => {
    downloadGraph(serializeGraph(pointsRef.current, sceneIdRef.current))
  }, [])

  const handleImportGraph = useCallback((graph: PersonalGraph) => {
    if (graph.embeddingModel !== sceneModelRef.current || graph.dim !== ACTIVE_DIM) {
      setProviderError(
        `Graph uses ${graph.embeddingModel}; this scene is ${sceneModelRef.current}. Can't merge.`,
      )
      return
    }
    undoStack.current.push([...pointsRef.current])
    undoExpandedStack.current.push(new Set(expandedIdsRef.current))
    setPoints(prev => {
      const existing = new Set(prev.map(p => p.id))
      const merged = [...prev, ...graph.points.filter(p => !p.isPending && !existing.has(p.id))]
      colorIndex.current = merged.length
      return merged
    })
  }, [])

  // ── Legacy points (old embedding space): re-embed into the current space ──────
  const handleReembedLegacy = useCallback(async () => {
    const legacy = legacyPoints
    if (!legacy) return
    setLegacyPoints(null)
    for (const p of legacy) await embedOne(p.text, undefined, p.origin ?? 'user')
  }, [legacyPoints, embedOne])

  const handleDiscardLegacy = useCallback(() => {
    setLegacyPoints(null)
    try { localStorage.removeItem('lse-points') } catch { /* ignore */ }
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

      // Import
      if (e.key === 'i') { setShowImport(true); return }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); handleUndo(); return }

      // Home
      if (e.key === 'h') { setHomeSignal(s => s + 1); return }

      // Dream toggle
      if (e.key === 'd') { setDreamMode(v => !v); return }

      const pts = pointsRef.current
      const sel = selectedIdRef.current

      if (e.key === 'Escape') {
        if (gpsFromRef.current) { setGpsFrom(null); return }
        if (activePathRef.current.length > 0) { setActivePath([]); setPathStep(-1); return }
        if (bridgeFromRef.current) { setBridgeFrom(null); return }
        setSelectedId(null)
        return
      }

      // GPS mode
      if (e.key === 'g' && sel) {
        if (gpsFromRef.current && gpsFromRef.current !== sel) {
          handleGPS(gpsFromRef.current, sel)
          setGpsFrom(null)
        } else {
          setGpsFrom(sel)
        }
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
        autoExpand={autoExpand}
        flyTarget={flyTarget}
        showLines={showLines}
        homeSignal={homeSignal}
        flySpeed={flySpeed}
        activePath={activePath}
        pathStep={pathStep}
        onSelectPoint={id => {
          if (!id) { setSelectedId(null); return }
          // GPS click-to-destination
          if (gpsFromRef.current && gpsFromRef.current !== id) {
            handleGPS(gpsFromRef.current, id)
            setGpsFrom(null)
          } else {
            navigateTo(id)
          }
        }}
        onExpandPoint={expandPoint}
        onContextMenu={handleContextMenu}
      />
      <HUD
        status={status}
        loadProgress={loadProgress}
        isExpanding={isExpanding}
        spread={spread}
        triggerRadius={triggerRadius}
        flySpeed={flySpeed}
        autoExpand={autoExpand}
        dreamMode={dreamMode}
        showLines={showLines}
        colorBy={colorBy}
        bridgeFrom={bridgeFrom ? points.find(p => p.id === bridgeFrom)?.text ?? null : null}
        gpsFrom={gpsFrom ? points.find(p => p.id === gpsFrom)?.text ?? null : null}
        activePath={activePath}
        pathStep={pathStep}
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
        onFlySpeedChange={setFlySpeed}
        onToggleAutoExpand={() => setAutoExpand(v => { autoExpandRef.current = !v; return !v })}
        onToggleDream={() => setDreamMode(v => !v)}
        onToggleLines={() => setShowLines(v => !v)}
        onSetColorBy={setColorBy}
        onGoHome={() => setHomeSignal(s => s + 1)}
        onCancelBridge={() => setBridgeFrom(null)}
        onCancelGPS={() => { setGpsFrom(null); setActivePath([]); setPathStep(-1) }}
        onSearch={() => setShowSearch(true)}
        onImport={() => setShowImport(true)}
        onExport={handleExport}
        onHelp={() => setShowHelp(true)}
        onSettings={() => setShowSettings(true)}
        onNavigate={navigateTo}
      />
      {showSearch && (
        <SearchOverlay
          points={points.filter(p => !p.isPending)}
          onSelect={id => { navigateTo(id); expandPoint(id) }}
          onClose={() => setShowSearch(false)}
        />
      )}
      {showImport && (
        <ImportOverlay
          onImport={handleImport}
          onImportGraph={handleImportGraph}
          onClose={() => setShowImport(false)}
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
      {showHelp && (
        <HelpOverlay firstVisit={firstVisit} onClose={closeHelp} />
      )}
      {showSettings && (
        <SettingsOverlay
          knowledgeId={knowledgeId}
          onKnowledgeChange={setKnowledgeId}
          onKeysChanged={() => setKeyVersion(v => v + 1)}
          embeddingModel={sceneModelRef.current}
          onClose={() => setShowSettings(false)}
        />
      )}
      {providerError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-md
          rounded-lg border border-amber-400/30 bg-amber-950/80 backdrop-blur-sm
          px-4 py-2.5 text-[12px] font-mono text-amber-200/90 shadow-xl">
          {providerError}
        </div>
      )}
      {legacyPoints && legacyPoints.length > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg flex items-center gap-3
          rounded-lg border border-amber-400/30 bg-amber-950/85 backdrop-blur-sm
          px-4 py-2.5 text-[12px] font-mono text-amber-200/90 shadow-xl">
          <span>{legacyPoints.length} saved points use an old embedding model.</span>
          <button onClick={handleReembedLegacy}
            className="rounded border border-amber-300/40 px-2 py-1 text-amber-100 hover:bg-amber-400/15 transition-colors">
            re-embed
          </button>
          <button onClick={handleDiscardLegacy}
            className="text-amber-200/60 hover:text-amber-100 transition-colors">discard</button>
        </div>
      )}
      <EmbedFeed pendingCount={points.filter(p => p.isPending).length} />
    </main>
  )
}
