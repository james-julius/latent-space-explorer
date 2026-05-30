'use client'

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '@/lib/types'

const LABEL_FULL_DIST  = 1.0   // fully visible within this distance
const LABEL_FADE_DIST  = 2.8   // fully invisible beyond this distance

interface PointSphereProps {
  point: Point
  isSelected: boolean
  isNeighbor: boolean
  isExpanded: boolean
  onSelect: (id: string) => void
}

function PointSphere({ point, isSelected, isNeighbor, isExpanded, onSelect }: PointSphereProps) {
  const { camera } = useThree()
  const groupRef      = useRef<THREE.Group>(null)
  const ringRef       = useRef<THREE.Mesh>(null)
  const labelRef      = useRef<HTMLDivElement>(null)
  const targetPos     = useRef(new THREE.Vector3(...point.position))
  const currentPos    = useRef(new THREE.Vector3(...point.position))
  const isSelectedRef = useRef(isSelected)
  const isNeighborRef = useRef(isNeighbor)
  isSelectedRef.current = isSelected
  isNeighborRef.current = isNeighbor

  useEffect(() => { targetPos.current.set(...point.position) }, [point.position])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Lerp position
    const lerpFactor = 1 - Math.pow(0.01, delta)
    currentPos.current.lerp(targetPos.current, lerpFactor)
    groupRef.current.position.copy(currentPos.current)

    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 1.5
      ringRef.current.rotation.y += delta * 0.8
    }

    // Distance-based label opacity — direct DOM, no React re-render
    if (labelRef.current) {
      if (isSelected || isNeighbor) {
        // Selected + neighbours always readable
        labelRef.current.style.opacity = '1'
      } else {
        const dist = camera.position.distanceTo(currentPos.current)
        const t = 1 - Math.max(0, Math.min(1,
          (dist - LABEL_FULL_DIST) / (LABEL_FADE_DIST - LABEL_FULL_DIST)
        ))
        labelRef.current.style.opacity = t.toFixed(3)
      }
    }
  })

  const emissiveIntensity = isSelected ? 1.5 : isNeighbor ? 0.8 : 0.4
  const radius      = isSelected ? 0.07 : isNeighbor ? 0.06 : 0.05
  const label       = point.text.split(' ').slice(0, 4).join(' ')
  const labelColor  = isSelected ? '#ffffff' : isNeighbor ? '#d0d0ff' : '#8888aa'
  const expandHint  = !isExpanded

  return (
    <group ref={groupRef}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelect(point.id) }}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial
          color={point.color}
          emissive={point.color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={isSelected ? 1 : isNeighbor ? 0.9 : 0.75}
        />
      </mesh>

      {isSelected && (
        <mesh ref={ringRef}>
          <torusGeometry args={[0.13, 0.008, 8, 32]} />
          <meshStandardMaterial
            color={point.color} emissive={point.color}
            emissiveIntensity={2} transparent opacity={0.85}
          />
        </mesh>
      )}

      <Html center position={[0, radius + 0.08, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[0, 10]}>
        <div
          ref={labelRef}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            userSelect: 'none', transition: 'none',
            background: isSelected ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)',
            border: `1px solid ${isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '4px',
            padding: isSelected ? '3px 7px' : '2px 5px',
          }}
        >
          <span style={{
            whiteSpace: 'nowrap',
            fontFamily: 'ui-monospace, monospace',
            fontSize: isSelected ? '12px' : '10px',
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? '#fff' : isNeighbor ? '#c8c8ff' : '#aaa',
            letterSpacing: '0.03em',
            lineHeight: 1.3,
          }}>
            {label}
          </span>
          {expandHint && !isNeighbor && (
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>+</span>
          )}
        </div>
      </Html>
    </group>
  )
}

interface PointCloudProps {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
  expandedIds: Set<string>
  onSelect: (id: string | null) => void
}

export function PointCloud({ points, selectedId, neighborIds, expandedIds, onSelect }: PointCloudProps) {
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
        />
      ))}
    </group>
  )
}
