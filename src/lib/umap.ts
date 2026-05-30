import { UMAP } from 'umap-js'
import { Point } from './types'

// Simple geometric fallbacks for too few points to UMAP
function fallbackPositions(n: number): [number, number, number][] {
  if (n === 0) return []
  if (n === 1) return [[0, 0, 0]]
  if (n === 2) return [[-1, 0, 0], [1, 0, 0]]
  if (n === 3) return [[-1, -0.5, 0], [1, -0.5, 0], [0, 1, 0]]
  // n === 4
  return [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]]
}

function cosineSimilarityMatrix(embeddings: number[][]): number[][] {
  const n = embeddings.length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 0
      let dot = 0, normA = 0, normB = 0
      for (let k = 0; k < embeddings[i].length; k++) {
        dot += embeddings[i][k] * embeddings[j][k]
        normA += embeddings[i][k] ** 2
        normB += embeddings[j][k] ** 2
      }
      // Convert similarity to distance (0–2 range)
      return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB))
    })
  )
}

export function projectToPositions(points: Point[]): [number, number, number][] {
  const n = points.length
  if (n <= 4) return fallbackPositions(n)

  const embeddings = points.map(p => p.embedding)
  const nNeighbors = Math.min(15, n - 1)

  try {
    const umap = new UMAP({
      nComponents: 3,
      nNeighbors,
      minDist: 0.2,
      spread: 2.0,
      nEpochs: n < 30 ? 300 : 200,
    })

    const result = umap.fit(embeddings)

    // Normalize to roughly [-2, 2] cube
    const allVals = result.flat()
    const min = Math.min(...allVals)
    const max = Math.max(...allVals)
    const range = max - min || 1
    const scale = 4 / range

    return result.map(([x, y, z]) => [
      (x - (min + max) / 2) * scale,
      (y - (min + max) / 2) * scale,
      (z - (min + max) / 2) * scale,
    ]) as [number, number, number][]
  } catch {
    return fallbackPositions(n)
  }
}

export function nearestNeighbors(targetId: string, points: Point[], k = 5): Point[] {
  const target = points.find(p => p.id === targetId)
  if (!target) return []

  return points
    .filter(p => p.id !== targetId)
    .map(p => {
      let dot = 0
      for (let i = 0; i < target.embedding.length; i++) {
        dot += target.embedding[i] * p.embedding[i]
      }
      return { point: p, similarity: dot }
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k)
    .map(x => x.point)
}
