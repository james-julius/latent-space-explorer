import type { Point, PointOrigin } from '@/lib/types'
import { pointColor } from '@/lib/colors'

// Identity of the runtime embedder. A scene's points can only be extended by an
// embedder whose model matches this — see Phase 5 mismatch handling.
export const ACTIVE_EMBEDDING_MODEL = 'bge-small-en-v1.5@384'
export const ACTIVE_DIM = 384
export const DEFAULT_SCENE = 'concept-atlas'

export interface SceneIndexEntry {
  sceneId: string
  title: string
  description: string
  count: number
  dim: number
  embeddingModel: string
}

interface ScenePointRecord {
  id: string
  text: string
  position: [number, number, number]
  topicId?: string
  origin?: PointOrigin
  emb: number[] // int8
}

interface SceneFile {
  schemaVersion: number
  sceneId: string
  title: string
  description: string
  embeddingModel: string
  dim: number
  quantization: 'int8' | 'none'
  points: ScenePointRecord[]
}

// int8 → float, then renormalize so cosine math matches live bge-small vectors.
function dequantize(emb: number[]): number[] {
  let norm = 0
  const v = new Array(emb.length)
  for (let i = 0; i < emb.length; i++) {
    const f = emb[i] / 127
    v[i] = f
    norm += f * f
  }
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < v.length; i++) v[i] /= norm
  return v
}

export async function loadSceneIndex(): Promise<SceneIndexEntry[]> {
  const res = await fetch('/scenes/index.json')
  if (!res.ok) throw new Error(`scene index ${res.status}`)
  return res.json()
}

export interface LoadedScene {
  embeddingModel: string
  dim: number
  points: Point[]
}

export async function loadScene(sceneId: string): Promise<LoadedScene> {
  const res = await fetch(`/scenes/${sceneId}.json`)
  if (!res.ok) throw new Error(`scene ${sceneId} ${res.status}`)
  const file = (await res.json()) as SceneFile

  const points: Point[] = file.points.map((p, i) => ({
    id: p.id,
    text: p.text,
    embedding: file.quantization === 'int8' ? dequantize(p.emb) : p.emb,
    position: p.position,
    color: pointColor(i),
    origin: p.origin ?? 'preset',
    source: p.topicId,
  }))

  return { embeddingModel: file.embeddingModel, dim: file.dim, points }
}
