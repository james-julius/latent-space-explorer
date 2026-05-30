'use client'

import { useEffect, useRef, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { PointCloud } from './PointCloud'
import { ConstellationLines } from './ConstellationLines'
import type { Point } from '@/lib/types'
import { liveCamera } from '@/lib/cameraState'

// ── First-person camera ───────────────────────────────────────────────────────
function CameraController({ homeSignal, flySpeed }: { homeSignal: number; flySpeed: number }) {
  const { camera, gl } = useThree()
  const keys = useRef(new Set<string>())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const homeCentroid = useRef<THREE.Vector3 | null>(null)
  const flyingHome = useRef(false)

  useEffect(() => { camera.rotation.order = 'YXZ' }, [camera])

  // Store centroid so home key can fly back to it
  const centroidRef = useRef(new THREE.Vector3())
  const setCentroid = (pts: Point[]) => {
    if (pts.length < 2) return
    centroidRef.current.set(
      pts.reduce((s, p) => s + p.position[0], 0) / pts.length,
      pts.reduce((s, p) => s + p.position[1], 0) / pts.length,
      pts.reduce((s, p) => s + p.position[2], 0) / pts.length,
    )
  }

  // Trigger home flight when homeSignal increments
  useEffect(() => {
    if (homeSignal === 0) return
    homeCentroid.current = centroidRef.current.clone().add(new THREE.Vector3(0, 0, 14))
    flyingHome.current = true
  }, [homeSignal])

  useEffect(() => {
    const canvas = gl.domElement
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      keys.current.add(e.key.toLowerCase())
    }
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        dragging.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      yaw.current -= dx * 0.003
      pitch.current = Math.max(-1.4, Math.min(1.4, pitch.current - dy * 0.003))
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => { dragging.current = false }
    const onContextMenu = (e: Event) => e.preventDefault()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('contextmenu', onContextMenu)
    }
  }, [gl])

  useFrame((_, delta) => {
    // Home flight
    if (flyingHome.current && homeCentroid.current) {
      camera.position.lerp(homeCentroid.current, 1 - Math.pow(0.001, delta))
      camera.rotation.set(0, 0, 0)
      yaw.current = 0; pitch.current = 0
      if (camera.position.distanceTo(homeCentroid.current) < 0.1) flyingHome.current = false
    }

    const warp = keys.current.has('shift')
    const MOVE = (warp ? 14 : 3.5) * flySpeed * delta
    const TURN = 1.6 * delta
    const k = keys.current

    if (k.has('arrowleft'))  yaw.current += TURN
    if (k.has('arrowright')) yaw.current -= TURN
    if (k.has('arrowup'))    pitch.current = Math.min(1.4, pitch.current + TURN)
    if (k.has('arrowdown'))  pitch.current = Math.max(-1.4, pitch.current - TURN)

    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current

    const lookDir = new THREE.Vector3()
    camera.getWorldDirection(lookDir)
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current))

    if (k.has('w')) camera.position.addScaledVector(lookDir, MOVE)
    if (k.has('s')) camera.position.addScaledVector(lookDir, -MOVE)
    if (k.has('a')) camera.position.addScaledVector(right, -MOVE)
    if (k.has('d')) camera.position.addScaledVector(right, MOVE)
    if (k.has('e')) camera.position.y += MOVE
    if (k.has('q')) camera.position.y -= MOVE

    // Update shared camera state for minimap
    liveCamera.x = camera.position.x
    liveCamera.y = camera.position.y
    liveCamera.z = camera.position.z
    liveCamera.yaw = yaw.current
    liveCamera.pitch = pitch.current
  })

  return null
}

// ── CameraController needs centroid updates, use a bridge ─────────────────────
function CentroidTracker({ points, onCentroid }: { points: Point[]; onCentroid: (v: THREE.Vector3) => void }) {
  useEffect(() => {
    const real = points.filter(p => !p.isPending)
    if (real.length < 2) return
    const v = new THREE.Vector3(
      real.reduce((s, p) => s + p.position[0], 0) / real.length,
      real.reduce((s, p) => s + p.position[1], 0) / real.length,
      real.reduce((s, p) => s + p.position[2], 0) / real.length,
    )
    onCentroid(v)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length])
  return null
}

// ── Fly-to ────────────────────────────────────────────────────────────────────
function CameraFlyTo({ target }: { target: [number, number, number] | null }) {
  const { camera } = useThree()
  const flyTarget = useRef<THREE.Vector3 | null>(null)
  const flying = useRef(false)

  useEffect(() => {
    if (!target) return
    flyTarget.current = new THREE.Vector3(target[0], target[1], target[2] + 6)
    flying.current = true
  }, [target])

  useFrame((_, delta) => {
    if (!flying.current || !flyTarget.current) return
    camera.position.lerp(flyTarget.current, 1 - Math.pow(0.001, delta))
    if (camera.position.distanceTo(flyTarget.current) < 0.08) flying.current = false
  })
  return null
}

// ── One-shot initial centre ───────────────────────────────────────────────────
function CenterOnPoints({ points }: { points: Point[] }) {
  const { camera } = useThree()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || points.length < 3) return
    done.current = true
    const real = points.filter(p => !p.isPending)
    if (!real.length) return
    const cx = real.reduce((s, p) => s + p.position[0], 0) / real.length
    const cy = real.reduce((s, p) => s + p.position[1], 0) / real.length
    const cz = real.reduce((s, p) => s + p.position[2], 0) / real.length
    camera.position.set(cx, cy, cz + 14)
    camera.rotation.set(0, 0, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length])
  return null
}

// ── Proximity expander ────────────────────────────────────────────────────────
function ProximityExpander({
  points, expandedIds, triggerRadius, enabled, onExpand,
}: {
  points: Point[]; expandedIds: Set<string>; triggerRadius: number; enabled: boolean; onExpand: (id: string) => void
}) {
  const { camera } = useThree()
  const cooldown = useRef<Map<string, number>>(new Map())
  const radiusRef = useRef(triggerRadius)
  radiusRef.current = triggerRadius
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useFrame(() => {
    if (!enabledRef.current) return
    const now = performance.now()
    for (const pt of points) {
      if (pt.isPending || expandedIds.has(pt.id)) continue
      const last = cooldown.current.get(pt.id) ?? 0
      if (now - last < 2000) continue
      const dist = camera.position.distanceTo(new THREE.Vector3(...pt.position))
      if (dist < radiusRef.current) {
        cooldown.current.set(pt.id, now)
        onExpand(pt.id)
      }
    }
  })
  return null
}

// ── GPS path line ─────────────────────────────────────────────────────────────
function PathLine({ points, activePath, pathStep }: {
  points: Point[]; activePath: string[]; pathStep: number
}) {
  const geoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry())

  useMemo(() => {
    const ordered = activePath
      .map(id => points.find(p => p.id === id))
      .filter(Boolean) as Point[]
    if (ordered.length < 2) { geoRef.current = new THREE.BufferGeometry(); return }
    const positions = new Float32Array(ordered.flatMap(p => p.position))
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geoRef.current = geo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, points])

  if (activePath.length < 2) return null

  const currentPt = points.find(p => p.id === activePath[pathStep])

  return (
    <group>
      {/* Path line */}
      <primitive object={new THREE.Line(geoRef.current, new THREE.LineBasicMaterial({
        color: '#fbbf24', transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }))} />
      {/* Current waypoint highlight */}
      {currentPt && (
        <mesh position={currentPt.position}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.9}
            blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

// ── Scene ─────────────────────────────────────────────────────────────────────
interface SceneProps {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
  expandedIds: Set<string>
  triggerRadius: number
  autoExpand: boolean
  flyTarget: [number, number, number] | null
  showLines: boolean
  homeSignal: number
  flySpeed: number
  activePath: string[]
  pathStep: number
  onSelectPoint: (id: string | null) => void
  onExpandPoint: (id: string) => void
  onContextMenu: (pointId: string, x: number, y: number) => void
}

export function Scene({
  points, selectedId, neighborIds, expandedIds,
  triggerRadius, autoExpand, flyTarget, showLines, homeSignal, flySpeed,
  activePath, pathStep,
  onSelectPoint, onExpandPoint, onContextMenu,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 72 }}
      style={{ background: '#050508' }}
      onPointerMissed={() => onSelectPoint(null)}
    >
      <ambientLight intensity={0.2} />
      <Stars radius={80} depth={60} count={1500} factor={2} fade />

      <CameraController homeSignal={homeSignal} flySpeed={flySpeed} />
      <CenterOnPoints points={points} />
      <CameraFlyTo target={flyTarget} />

      <ProximityExpander
        points={points}
        expandedIds={expandedIds}
        triggerRadius={triggerRadius}
        enabled={autoExpand}
        onExpand={onExpandPoint}
      />

      {showLines && (
        <ConstellationLines
          points={points}
          selectedId={selectedId}
          neighborIds={neighborIds}
        />
      )}

      <PathLine points={points} activePath={activePath} pathStep={pathStep} />

      <PointCloud
        points={points}
        selectedId={selectedId}
        neighborIds={neighborIds}
        expandedIds={expandedIds}
        onSelect={onSelectPoint}
        onContextMenu={onContextMenu}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.25}
          luminanceSmoothing={0.7}
          intensity={0.35}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}
