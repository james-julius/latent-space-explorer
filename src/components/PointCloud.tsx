'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '@/lib/types'

// Tiny radii so the cloud reads as a nebula, not soap bubbles
const R_NORMAL   = 0.016
const R_NEIGHBOR = 0.022
const R_SELECTED = 0.038

// Hard cap: only the N closest non-priority labels are shown at once.
// Selected + neighbours are always shown regardless.
const MAX_PROXIMITY_LABELS = 28
const LABEL_FULL_DIST = 5.0    // full opacity within this distance
const LABEL_FADE_DIST = 18.0   // invisible beyond this distance
const FOV_HALF_DEG    = 50     // only show labels within this half-angle of look direction

// Module-level set so PointCloud's useFrame can inform each PointSphere's useFrame
// without triggering React re-renders. Safe as long as there is one PointCloud.
let proximityVisible: Set<string> = new Set()

// ── Per-point sphere ──────────────────────────────────────────────────────────
interface PointSphereProps {
  point: Point
  isSelected: boolean
  isNeighbor: boolean
  isExpanded: boolean
  onSelect: (id: string) => void
  onContextMenu?: (pointId: string, x: number, y: number) => void
}

// Standalone spinning loader ring — used for pending points
function LoaderRing({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  useFrame((_, delta) => {
    if (!meshRef.current) return
    t.current += delta * 2.5
    meshRef.current.rotation.x = t.current
    meshRef.current.rotation.y = t.current * 0.7
  })
  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[0.055, 0.004, 6, 20]} />
      <meshBasicMaterial
        color={color} transparent opacity={0.7}
        blending={THREE.AdditiveBlending} depthWrite={false}
      />
    </mesh>
  )
}

function PointSphere({ point, isSelected, isNeighbor, isExpanded, onSelect, onContextMenu }: PointSphereProps) {
  const { camera }    = useThree()
  const groupRef      = useRef<THREE.Group>(null)
  const ringRef       = useRef<THREE.Mesh>(null)
  const labelRef      = useRef<HTMLDivElement>(null)
  const targetPos     = useRef(new THREE.Vector3(...point.position))
  const currentPos    = useRef(new THREE.Vector3(...point.position))
  const isSelectedRef  = useRef(isSelected)
  const isNeighborRef  = useRef(isNeighbor)
  const wasPendingRef  = useRef(point.isPending ?? false)
  isSelectedRef.current = isSelected
  isNeighborRef.current = isNeighbor

  useEffect(() => {
    const wasPending = wasPendingRef.current
    const nowPending = point.isPending ?? false
    wasPendingRef.current = nowPending

    if (wasPending && !nowPending) {
      // Pending just resolved → snap directly to final position, no lerp
      currentPos.current.set(...point.position)
      targetPos.current.set(...point.position)
      if (groupRef.current) groupRef.current.position.set(...point.position)
    } else {
      // Normal move → lerp to new target
      targetPos.current.set(...point.position)
    }
  }, [point.position, point.isPending])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const lerpFactor = 1 - Math.pow(0.01, delta)
    currentPos.current.lerp(targetPos.current, lerpFactor)
    groupRef.current.position.copy(currentPos.current)

    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 1.5
      ringRef.current.rotation.y += delta * 0.8
    }

    // Depth fog on the sphere material
    if (matRef.current) {
      const dist = camera.position.distanceTo(currentPos.current)
      const fog = 1 - Math.max(0, Math.min(1, (dist - 8) / (35 - 8)))
      const target = (isPending ? 0.25 : isSelectedRef.current ? 0.95 : isNeighborRef.current ? 0.75 : 0.55) * fog
      matRef.current.opacity = Math.max(0.03, target)
    }

    if (labelRef.current) {
      const sel = isSelectedRef.current
      const nbr = isNeighborRef.current
      if (sel || nbr) {
        labelRef.current.style.opacity = '1'
        labelRef.current.style.display = 'inline-flex'
      } else if (proximityVisible.has(point.id)) {
        // Proximity labels: fade by distance
        const dist = camera.position.distanceTo(currentPos.current)
        const t = 1 - Math.max(0, Math.min(1,
          (dist - LABEL_FULL_DIST) / (LABEL_FADE_DIST - LABEL_FULL_DIST)
        ))
        labelRef.current.style.opacity = t.toFixed(3)
        labelRef.current.style.display = t > 0.08 ? 'inline-flex' : 'none'
      } else {
        labelRef.current.style.display = 'none'
      }
    }
  })

  const isPending  = point.isPending ?? false
  const radius     = isSelected ? R_SELECTED : isNeighbor ? R_NEIGHBOR : R_NORMAL
  const label      = point.text.split(' ').slice(0, 4).join(' ')
  const expandHint = !isExpanded && !isNeighbor && !isPending
  const baseOpacity = isPending ? 0.25 : isSelected ? 0.95 : isNeighbor ? 0.75 : 0.55
  const matRef     = useRef<THREE.MeshBasicMaterial>(null)

  return (
    <group ref={groupRef}>
      <mesh
        onClick={(e) => { e.stopPropagation(); if (!isPending) onSelect(point.id) }}
        onContextMenu={(e) => {
          e.stopPropagation()
          if (!isPending && onContextMenu) {
            const ne = e.nativeEvent as MouseEvent
            onContextMenu(point.id, ne.clientX, ne.clientY)
          }
        }}
        onPointerOver={() => { if (!isPending) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[radius, 12, 12]} />
        <meshBasicMaterial
          ref={matRef}
          color={point.color}
          transparent opacity={baseOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Pending: spinning loader ring */}
      {isPending && <LoaderRing color={point.color} />}

      {/* Selected: slow orbit ring */}
      {isSelected && !isPending && (
        <mesh ref={ringRef}>
          <torusGeometry args={[0.06, 0.004, 8, 32]} />
          <meshBasicMaterial
            color={point.color}
            transparent opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      <Html center position={[0, radius + 0.08, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[0, 10]}>
        <div
          ref={labelRef}
          style={{
            display: 'none', // controlled via useFrame
            alignItems: 'center', gap: '3px',
            userSelect: 'none',
            // Strong dark background so it reads over any sphere colour
            background: 'rgba(4,4,10,0.88)',
            border: `1px solid ${isSelected ? 'rgba(255,255,255,0.35)' : isNeighbor ? 'rgba(180,180,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '4px',
            padding: isSelected ? '3px 8px' : '2px 6px',
            boxShadow: isSelected ? '0 0 12px rgba(0,0,0,0.8)' : '0 1px 8px rgba(0,0,0,0.9)',
          }}
        >
          <span style={{
            whiteSpace: 'nowrap',
            fontFamily: 'ui-monospace, monospace',
            fontSize: isSelected ? '13px' : '11px',
            fontWeight: isSelected ? 600 : 400,
            fontStyle: isPending ? 'italic' : 'normal',
            color: isPending ? 'rgba(200,200,255,0.5)' : isSelected ? '#ffffff' : isNeighbor ? '#d0d8ff' : '#b0b0c8',
            letterSpacing: '0.02em',
            lineHeight: 1.3,
          }}>
            {label}{isPending ? '…' : ''}
          </span>
          {expandHint && (
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.22)', lineHeight: 1 }}>+</span>
          )}
        </div>
      </Html>
    </group>
  )
}

// ── Parent: manages the proximity label budget ────────────────────────────────
interface PointCloudProps {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
  expandedIds: Set<string>
  onSelect: (id: string | null) => void
  onContextMenu?: (pointId: string, x: number, y: number) => void
}

export function PointCloud({ points, selectedId, neighborIds, expandedIds, onSelect, onContextMenu }: PointCloudProps) {
  const { camera } = useThree()
  const pointsRef = useRef(points)
  const selectedIdRef = useRef(selectedId)
  const neighborIdsRef = useRef(neighborIds)
  pointsRef.current = points
  selectedIdRef.current = selectedId
  neighborIdsRef.current = neighborIds

  // Once per frame: compute the N closest non-priority points and update the shared set
  const lookDir = new THREE.Vector3()
  const toPoint = new THREE.Vector3()
  const fovCosThreshold = Math.cos((FOV_HALF_DEG * Math.PI) / 180)

  useFrame(() => {
    const sel  = selectedIdRef.current
    const nbr  = neighborIdsRef.current
    const pts  = pointsRef.current

    camera.getWorldDirection(lookDir)

    const candidates: { id: string; score: number }[] = []

    for (const p of pts) {
      if (p.id === sel || nbr.has(p.id) || p.isPending) continue

      toPoint.set(...p.position).sub(camera.position)
      const dist = toPoint.length()
      if (dist > LABEL_FADE_DIST) continue

      toPoint.divideScalar(dist) // normalize in place
      const alignment = lookDir.dot(toPoint) // 1 = directly ahead, -1 = behind

      // Cull anything outside the FOV cone
      if (alignment < fovCosThreshold) continue

      // Score: prefer points that are close AND directly ahead
      // The (alignment + 1) term ranges 0–2, so forward points score much higher
      const score = (alignment + 1) / Math.max(dist, 0.1)
      candidates.push({ id: p.id, score })
    }

    candidates.sort((a, b) => b.score - a.score)
    proximityVisible = new Set(candidates.slice(0, MAX_PROXIMITY_LABELS).map(c => c.id))
  })

  return (
    <group>
      {points.map(point => (
        <PointSphere
          key={point.id}
          point={point}
          isSelected={point.id === selectedId}
          isNeighbor={neighborIds.has(point.id)}
          isExpanded={expandedIds.has(point.id)}
          onSelect={onSelect}
          onContextMenu={onContextMenu}
        />
      ))}
    </group>
  )
}
