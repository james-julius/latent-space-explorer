'use client'

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { Point } from '@/lib/types'

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

function buildLineGeometry(positions: Float32Array, colors: Float32Array) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

interface Props {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
}

export function ConstellationLines({ points, selectedId, neighborIds }: Props) {
  const dimGeoRef    = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry())
  const brightGeoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry())

  useMemo(() => {
    const real = points.filter(p => !p.isPending && p.embedding.length > 0)
    if (real.length < 2) {
      dimGeoRef.current = new THREE.BufferGeometry()
      brightGeoRef.current = new THREE.BufferGeometry()
      return
    }

    const dimPos: number[] = [], dimCol: number[] = []
    const brtPos: number[] = [], brtCol: number[] = []
    const added = new Set<string>()

    for (const pt of real) {
      const scored = real
        .filter(p => p.id !== pt.id)
        .map(p => ({ p, sim: cosineSim(pt.embedding, p.embedding) }))
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 2)

      for (const { p } of scored) {
        const key = [pt.id, p.id].sort().join('|')
        if (added.has(key)) continue
        added.add(key)
        const isActive = pt.id === selectedId || p.id === selectedId || neighborIds.has(pt.id) || neighborIds.has(p.id)
        const arr = isActive ? brtPos : dimPos
        const col = isActive ? brtCol : dimCol
        arr.push(...pt.position, ...p.position)
        const c = new THREE.Color(pt.color)
        col.push(c.r, c.g, c.b, c.r, c.g, c.b)
      }
    }

    dimGeoRef.current = dimPos.length
      ? buildLineGeometry(new Float32Array(dimPos), new Float32Array(dimCol))
      : new THREE.BufferGeometry()

    brightGeoRef.current = brtPos.length
      ? buildLineGeometry(new Float32Array(brtPos), new Float32Array(brtCol))
      : new THREE.BufferGeometry()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, selectedId, neighborIds])

  useEffect(() => {
    return () => {
      dimGeoRef.current.dispose()
      brightGeoRef.current.dispose()
    }
  }, [])

  return (
    <group>
      <lineSegments geometry={dimGeoRef.current}>
        <lineBasicMaterial vertexColors transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={brightGeoRef.current}>
        <lineBasicMaterial vertexColors transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  )
}
