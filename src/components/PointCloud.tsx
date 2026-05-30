'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from '@/lib/types'

interface PointSphereProps {
  point: Point
  isSelected: boolean
  isNeighbor: boolean
  onSelect: (id: string) => void
}

function PointSphere({ point, isSelected, isNeighbor, onSelect }: PointSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const targetPos = useRef(new THREE.Vector3(...point.position))
  const currentPos = useRef(new THREE.Vector3(...point.position))

  useEffect(() => {
    targetPos.current.set(...point.position)
  }, [point.position])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const lerpFactor = 1 - Math.pow(0.01, delta)
    currentPos.current.lerp(targetPos.current, lerpFactor)
    meshRef.current.position.copy(currentPos.current)
    if (ringRef.current) {
      ringRef.current.position.copy(currentPos.current)
      ringRef.current.rotation.x += delta * 1.5
      ringRef.current.rotation.y += delta * 0.8
    }
  })

  const baseOpacity = isSelected ? 1 : isNeighbor ? 0.9 : 0.7
  const emissiveIntensity = isSelected ? 1.5 : isNeighbor ? 0.8 : 0.4
  const radius = isSelected ? 0.07 : 0.05

  // Truncate label to first 3 words
  const label = point.text.split(' ').slice(0, 3).join(' ')

  return (
    <group>
      <mesh
        ref={meshRef}
        position={point.position}
        onClick={(e) => { e.stopPropagation(); onSelect(point.id) }}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'default'}
      >
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial
          color={point.color}
          emissive={point.color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={baseOpacity}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh ref={ringRef} position={point.position}>
          <torusGeometry args={[0.12, 0.008, 8, 32]} />
          <meshStandardMaterial
            color={point.color}
            emissive={point.color}
            emissiveIntensity={2}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[
          point.position[0],
          point.position[1] + 0.12,
          point.position[2],
        ]}
        fontSize={0.055}
        color={isSelected ? '#ffffff' : isNeighbor ? '#ccccff' : '#8888aa'}
        anchorX="center"
        anchorY="bottom"
        renderOrder={1}
        depthOffset={-1}
      >
        {label}
      </Text>
    </group>
  )
}

interface PointCloudProps {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
  onSelect: (id: string | null) => void
}

export function PointCloud({ points, selectedId, neighborIds, onSelect }: PointCloudProps) {
  return (
    <group>
      {points.map(point => (
        <PointSphere
          key={point.id}
          point={point}
          isSelected={point.id === selectedId}
          isNeighbor={neighborIds.has(point.id)}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
