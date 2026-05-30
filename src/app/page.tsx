'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { HUD } from '@/components/HUD'
import type { Point, ModelStatus, WorkerOutgoing } from '@/lib/types'
import { pointColor } from '@/lib/colors'
import { projectToPositions, nearestNeighbors } from '@/lib/umap'

// Three.js cannot SSR
const Scene = dynamic(() => import('@/components/Scene').then(m => m.Scene), { ssr: false })

export default function Home() {
  const [points, setPoints] = useState<Point[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState<ModelStatus>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const workerRef = useRef<Worker | null>(null)
  const pendingEmbeds = useRef<Map<string, string>>(new Map())
  const colorIndex = useRef(0)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/embedder.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<WorkerOutgoing>) => {
      const msg = e.data
      if (msg.type === 'status') {
        setStatus(msg.status)
        if (msg.progress !== undefined) setLoadProgress(msg.progress)
      } else if (msg.type === 'result') {
        const text = pendingEmbeds.current.get(msg.id)
        pendingEmbeds.current.delete(msg.id)
        if (!text) return

        const color = pointColor(colorIndex.current++)
        const newPoint: Point = {
          id: msg.id,
          text,
          embedding: msg.embedding,
          position: [0, 0, 0],
          color,
        }

        setPoints(prev => {
          const next = [...prev, newPoint]
          const positions = projectToPositions(next)
          return next.map((p, i) => ({ ...p, position: positions[i] }))
        })
      }
    }

    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const handleEmbed = useCallback((text: string) => {
    if (!workerRef.current || status !== 'ready') return
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    pendingEmbeds.current.set(id, text)
    workerRef.current.postMessage({ type: 'embed', text, id })
  }, [status])

  const handleLoadPreset = useCallback((texts: string[]) => {
    if (!workerRef.current || status !== 'ready') return
    setPoints([])
    setSelectedId(null)
    colorIndex.current = 0
    pendingEmbeds.current.clear()
    texts.forEach(text => handleEmbed(text))
  }, [status, handleEmbed])

  const handleClear = useCallback(() => {
    setPoints([])
    setSelectedId(null)
    colorIndex.current = 0
    pendingEmbeds.current.clear()
  }, [])

  const neighborIds = selectedId
    ? new Set(nearestNeighbors(selectedId, points, 5).map(p => p.id))
    : new Set<string>()

  return (
    <main className="fixed inset-0 overflow-hidden">
      <Scene
        points={points}
        selectedId={selectedId}
        neighborIds={neighborIds}
        onSelectPoint={setSelectedId}
      />
      <HUD
        status={status}
        loadProgress={loadProgress}
        points={points}
        selectedId={selectedId}
        onEmbed={handleEmbed}
        onLoadPreset={handleLoadPreset}
        onClear={handleClear}
      />
    </main>
  )
}
