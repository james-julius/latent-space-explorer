export interface Point {
  id: string
  text: string
  embedding: number[]
  position: [number, number, number]
  color: string
  isPending?: boolean   // true while Ollama embedding is in-flight
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export type WorkerIncoming = { type: 'embed'; text: string; id: string }

export type WorkerOutgoing =
  | { type: 'status'; status: ModelStatus; progress?: number }
  | { type: 'result'; id: string; embedding: number[] }
  | { type: 'error'; message: string }
