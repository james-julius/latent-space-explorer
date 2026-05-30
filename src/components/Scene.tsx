'use client'

import { useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { PointCloud } from './PointCloud'
import type { Point } from '@/lib/types'

// ── First-person camera: WASD moves, mouse drag / arrow keys rotate ──────────
function CameraController() {
  const { camera, gl } = useThree()
  const keys = useRef(new Set<string>())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const dragging = useRef(false)
  const mouseMoved = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Camera at [0,0,8] with yaw=0 already looks toward -Z (the origin). No offset needed.
    camera.rotation.order = 'YXZ'
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      keys.current.add(e.key.toLowerCase())
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase())
    }

    const onMouseDown = (e: MouseEvent) => {
      // Only right-click or middle-click for free look; left-click stays for selection
      // Actually: left-click drag = look, left-click no-drag = select (handled in PointCloud)
      if (e.button === 0 || e.button === 2) {
        dragging.current = true
        mouseMoved.current = false
        lastMouse.current = { x: e.clientX, y: e.clientY }
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) mouseMoved.current = true
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
    const MOVE = 3.5 * delta
    const TURN = 1.6 * delta
    const k = keys.current

    // Arrow keys rotate view
    if (k.has('arrowleft'))  yaw.current += TURN
    if (k.has('arrowright')) yaw.current -= TURN
    if (k.has('arrowup'))    pitch.current = Math.min(1.4, pitch.current + TURN)
    if (k.has('arrowdown'))  pitch.current = Math.max(-1.4, pitch.current - TURN)

    // Apply rotation
    camera.rotation.y = yaw.current
    camera.rotation.x = pitch.current

    // W/S: full 6DOF — follows the exact look direction (including pitch)
    const lookDir = new THREE.Vector3()
    camera.getWorldDirection(lookDir)

    // A/D: horizontal strafe only (ignore pitch so you don't drift vertically)
    const right = new THREE.Vector3(
      Math.cos(yaw.current), 0, -Math.sin(yaw.current)
    )

    if (k.has('w')) camera.position.addScaledVector(lookDir, MOVE)
    if (k.has('s')) camera.position.addScaledVector(lookDir, -MOVE)
    if (k.has('a')) camera.position.addScaledVector(right, -MOVE)
    if (k.has('d')) camera.position.addScaledVector(right, MOVE)
    // E = up, Q = down
    if (k.has('e')) camera.position.y += MOVE
    if (k.has('q')) camera.position.y -= MOVE
  })

  return null
}

// ── One-shot camera centre: fires when points first exist, never again ─────────
function CenterOnPoints({ points }: { points: Point[] }) {
  const { camera } = useThree()
  const done = useRef(false)

  useEffect(() => {
    // Only fire once, and only once we have enough points to have a real centroid
    if (done.current || points.length < 3) return
    done.current = true

    const cx = points.reduce((s, p) => s + p.position[0], 0) / points.length
    const cy = points.reduce((s, p) => s + p.position[1], 0) / points.length
    const cz = points.reduce((s, p) => s + p.position[2], 0) / points.length

    camera.position.set(cx, cy, cz + 8)
    camera.rotation.set(0, 0, 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]) // only re-check when count changes, not on every frame

  return null
}

// ── Fires onExpand when camera drifts within threshold of an unexpanded point ─
interface ProximityExpanderProps {
  points: Point[]
  expandedIds: Set<string>
  triggerRadius: number
  onExpand: (id: string) => void
}

function ProximityExpander({ points, expandedIds, triggerRadius, onExpand }: ProximityExpanderProps) {
  const { camera } = useThree()
  const cooldown = useRef<Map<string, number>>(new Map())
  const radiusRef = useRef(triggerRadius)
  radiusRef.current = triggerRadius

  useFrame(() => {
    const now = performance.now()
    for (const pt of points) {
      if (expandedIds.has(pt.id)) continue
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

// ── Scene ─────────────────────────────────────────────────────────────────────
interface SceneProps {
  points: Point[]
  selectedId: string | null
  neighborIds: Set<string>
  expandedIds: Set<string>
  triggerRadius: number
  onSelectPoint: (id: string | null) => void
  onExpandPoint: (id: string) => void
}

export function Scene({
  points, selectedId, neighborIds, expandedIds, triggerRadius,
  onSelectPoint, onExpandPoint,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 75 }}
      style={{ background: '#050508' }}
      onPointerMissed={() => onSelectPoint(null)}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4466ff" />
      <Stars radius={50} depth={30} count={3000} factor={3} fade />

      <CameraController />
      <CenterOnPoints points={points} />

      <ProximityExpander
        points={points}
        expandedIds={expandedIds}
        triggerRadius={triggerRadius}
        onExpand={onExpandPoint}
      />

      <PointCloud
        points={points}
        selectedId={selectedId}
        neighborIds={neighborIds}
        expandedIds={expandedIds}
        onSelect={onSelectPoint}
      />
    </Canvas>
  )
}
