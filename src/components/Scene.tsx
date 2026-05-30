'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { PointCloud } from './PointCloud'
import type { Point } from '@/lib/types'

interface SceneProps {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
  onSelectPoint: (id: string | null) => void
}

export function Scene({ points, selectedId, neighborIds, onSelectPoint }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ background: '#050508' }}
      onPointerMissed={() => onSelectPoint(null)}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4466ff" />
      <Stars radius={50} depth={30} count={3000} factor={3} fade />

      <PointCloud
        points={points}
        selectedId={selectedId}
        neighborIds={neighborIds}
        onSelect={onSelectPoint}
      />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        zoomSpeed={0.8}
        rotateSpeed={0.6}
        makeDefault
      />
    </Canvas>
  )
}
