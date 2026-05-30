import { UMAP } from 'umap-js'
import { Point } from './types'

// After this many points, stop re-running global UMAP.
// New arrivals are placed near their semantic neighbours instead.
export const STABLE_THRESHOLD = 10

function fallbackPositions(n: number): [number, number, number][] {
  if (n === 0) return []
  if (n === 1) return [[0, 0, 0]]
  if (n === 2) return [[-1.5, 0, 0], [1.5, 0, 0]]
  if (n === 3) return [[-1.5, -0.8, 0], [1.5, -0.8, 0], [0, 1.2, 0]]
  return [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]]
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

// Full UMAP projection — only used for the seed cluster
export function projectToPositions(points: Point[]): [number, number, number][] {
  const n = points.length
  if (n <= 4) return fallbackPositions(n)

  const embeddings = points.map(p => p.embedding)
  const nNeighbors = Math.min(15, n - 1)

  try {
    const umap = new UMAP({ nComponents: 3, nNeighbors, minDist: 0.3, spread: 3.0, nEpochs: n < 30 ? 300 : 200 })
    const result = umap.fit(embeddings)
    const allVals = result.flat()
    const min = Math.min(...allVals)
    const max = Math.max(...allVals)
    const scale = 7 / (max - min || 1)
    return result.map(([x, y, z]) => [
      (x - (min + max) / 2) * scale,
      (y - (min + max) / 2) * scale,
      (z - (min + max) / 2) * scale,
    ]) as [number, number, number][]
  } catch {
    return fallbackPositions(n)
  }
}

// Incremental placement: put a new point near its k nearest semantic neighbours.
// Existing points don't move — the world stays stable.
export function placeNearNeighbors(
  newEmbedding: number[],
  existingPoints: Point[],
  spread = 0.4
): [number, number, number] {
  if (existingPoints.length === 0) return [0, 0, 0]

  const k = Math.min(3, existingPoints.length)
  const nearest = [...existingPoints]
    .map(p => ({ p, sim: cosineSim(newEmbedding, p.embedding) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k)

  // Weighted centroid (closer neighbours pull harder)
  const totalSim = nearest.reduce((s, { sim }) => s + sim, 0) || 1
  let cx = 0, cy = 0, cz = 0
  for (const { p, sim } of nearest) {
    const w = sim / totalSim
    cx += p.position[0] * w
    cy += p.position[1] * w
    cz += p.position[2] * w
  }

  // Small deterministic-ish jitter based on the embedding itself
  const jx = ((newEmbedding[0] ?? 0) % 1) * spread - spread / 2
  const jy = ((newEmbedding[1] ?? 0) % 1) * spread - spread / 2
  const jz = ((newEmbedding[2] ?? 0) % 1) * spread - spread / 2

  return [cx + jx, cy + jy, cz + jz]
}

export function nearestNeighbors(targetId: string, points: Point[], k = 5): Point[] {
  const target = points.find(p => p.id === targetId)
  if (!target) return []
  return points
    .filter(p => p.id !== targetId)
    .map(p => ({ point: p, similarity: cosineSim(target.embedding, p.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
    .map(x => x.point)
}
