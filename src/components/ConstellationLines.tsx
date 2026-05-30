'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import type { Point } from '@/lib/types'

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

interface Props {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
}

export function ConstellationLines({ points, selectedId, neighborIds }: Props) {
  const { dimPositions, dimColors, brightPositions, brightColors } = useMemo(() => {
    const real = points.filter(p => !p.isPending && p.embedding.length > 0)
    if (real.length < 2) return { dimPositions: [], dimColors: [], brightPositions: [], brightColors: [] }

    const dimPos: number[] = []
    const dimCol: number[] = []
    const brightPos: number[] = []
    const brightCol: number[] = []

    const added = new Set<string>()

    for (const pt of real) {
      // Find 2 nearest by cosine similarity
      const scored = real
        .filter(p => p.id !== pt.id)
        .map(p => ({ p, sim: cosineSim(pt.embedding, p.embedding) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 2)

      for (const { p } of scored) {
        const key = [pt.id, p.id].sort().join('|')
        if (added.has(key)) continue
        added.add(key)

        const isActive =
          pt.id === selectedId || p.id === selectedId ||
          neighborIds.has(pt.id) || neighborIds.has(p.id)

        const arr = isActive ? brightPos : dimPos
        const col = isActive ? brightCol : dimCol

        arr.push(...pt.position, ...p.position)
        // Color: interpolate between the two point colors (simple: use first)
        const c = new THREE.Color(pt.color)
        col.push(c.r, c.g, c.b, c.r, c.g, c.b)
      }
    }

    return {
      dimPositions: new Float32Array(dimPos),
      dimColors: new Float32Array(dimCol),
      brightPositions: new Float32Array(brightPos),
      brightColors: new Float32Array(brightCol),
    }
  }, [points, selectedId, neighborIds])

  return (
    <group>
      {dimPositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dimPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[dimColors, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors transparent opacity={0.12}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </lineSegments>
      )}
      {brightPositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[brightPositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[brightColors, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors transparent opacity={0.55}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  )
}
