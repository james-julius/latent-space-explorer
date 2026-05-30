export interface Point {
  id: string
  text: string
  embedding: number[]
  position: [number, number, number]
  color: string
  baseColor?: string     // original color before cluster override
  isPending?: boolean    // true while Ollama embedding is in-flight
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ContextMenuState {
  x: number
  y: number
  pointId: string
}

export interface FeedItem {
  id: string
  text: string
  color: string
  status: 'embedding' | 'done'
}

export type WorkerIncoming = { type: 'embed'; text: string; id: string }

export type WorkerOutgoing =
  | { type: 'status'; status: ModelStatus; progress?: number }
  | { type: 'result'; id: string; embedding: number[] }
  | { type: 'error'; message: string }
