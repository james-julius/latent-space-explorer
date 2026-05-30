'use client'

import { useRef, useEffect } from 'react'
import type { Point } from '@/lib/types'
import { liveCamera } from '@/lib/cameraState'

interface Props {
  points: Point[]
}

export function Minimap({ points }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef(points)
  pointsRef.current = points

  useEffect(() => {
    let raf: number
    const SIZE = 160

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) { raf = requestAnimationFrame(draw); return }
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, SIZE, SIZE)

      // Background
      ctx.fillStyle = 'rgba(5,5,12,0.85)'
      ctx.fillRect(0, 0, SIZE, SIZE)

      const pts = pointsRef.current.filter(p => !p.isPending)
      if (pts.length === 0) {
        // Just show camera dot
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.arc(SIZE / 2, SIZE / 2, 3, 0, Math.PI * 2)
        ctx.fill()
        raf = requestAnimationFrame(draw)
        return
      }

      // Compute bounds (XZ plane = top-down)
      const allX = [...pts.map(p => p.position[0]), liveCamera.x]
      const allZ = [...pts.map(p => p.position[2]), liveCamera.z]
      const minX = Math.min(...allX)
      const maxX = Math.max(...allX)
      const minZ = Math.min(...allZ)
      const maxZ = Math.max(...allZ)
      const span = Math.max(maxX - minX, maxZ - minZ, 1)
      const pad = span * 0.12
      const total = span + 2 * pad

      const toS = (x: number, z: number): [number, number] => [
        ((x - minX + pad) / total) * SIZE,
        ((z - minZ + pad) / total) * SIZE,
      ]

      // Draw edges (very faint)
      ctx.globalAlpha = 0.08
      ctx.strokeStyle = '#8888ff'
      ctx.lineWidth = 0.5

      // Draw points
      ctx.globalAlpha = 0.75
      for (const pt of pts) {
        const [sx, sz] = toS(pt.position[0], pt.position[2])
        ctx.fillStyle = pt.color
        ctx.beginPath()
        ctx.arc(sx, sz, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw camera as white arrow
      const [cx, cz] = toS(liveCamera.x, liveCamera.z)
      ctx.globalAlpha = 1
      ctx.save()
      ctx.translate(cx, cz)
      ctx.rotate(-liveCamera.yaw)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(0, -7)
      ctx.lineTo(-3.5, 5)
      ctx.lineTo(0, 2)
      ctx.lineTo(3.5, 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Border + label
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1)

      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '9px ui-monospace, monospace'
      ctx.fillText('MAP', 5, SIZE - 5)

      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={160}
      style={{ borderRadius: '8px', display: 'block' }}
    />
  )
}
