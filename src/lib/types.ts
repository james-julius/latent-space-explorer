export interface Point {
  id: string
  text: string
  embedding: number[]
  position: [number, number, number]
  color: string
  baseColor?: string     // original color before cluster override
  isPending?: boolean    // true while Ollama embedding is in-flight
  source?: string        // document name (for imported docs)
  fullText?: string      // full passage (for imported docs; text is the short label)
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface ContextMenuState {
  x: number
  y: number
  pointId: string
}


export type WorkerIncoming = { type: 'embed'; text: string; id: string }

export type WorkerOutgoing =
  | { type: 'status'; status: ModelStatus; progress?: number }
  | { type: 'result'; id: string; embedding: number[] }
  | { type: 'error'; message: string }
