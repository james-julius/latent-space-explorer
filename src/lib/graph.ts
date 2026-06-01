import type { Point } from '@/lib/types'
import { ACTIVE_EMBEDDING_MODEL, ACTIVE_DIM } from '@/lib/scenes'

// A personal grown graph, exported/imported as JSON. Full-fidelity (float
// embeddings) since these files are user-held, not shipped to every visitor.
export interface PersonalGraph {
  schemaVersion: 1
  kind: 'personal-graph'
  embeddingModel: string
  dim: number
  sceneId?: string
  points: Point[]
}

export function serializeGraph(points: Point[], sceneId?: string): PersonalGraph {
  return {
    schemaVersion: 1,
    kind: 'personal-graph',
    embeddingModel: ACTIVE_EMBEDDING_MODEL,
    dim: ACTIVE_DIM,
    sceneId,
    points: points.filter(p => !p.isPending),
  }
}

export function downloadGraph(graph: PersonalGraph): void {
  const blob = new Blob([JSON.stringify(graph)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `latent-space-${graph.sceneId ?? 'graph'}-${graph.points.length}pts.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseGraph(raw: string): PersonalGraph | null {
  let data: unknown
  try { data = JSON.parse(raw) } catch { return null }
  if (!data || typeof data !== 'object') return null
  const g = data as Partial<PersonalGraph>
  if (g.kind !== 'personal-graph' || !Array.isArray(g.points)) return null
  return g as PersonalGraph
}
