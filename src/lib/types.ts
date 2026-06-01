export type PointOrigin = 'preset' | 'user' | 'claude' | 'gpt' | 'gemini' | 'import'

export interface Point {
  id: string
  text: string
  embedding: number[]
  position: [number, number, number]
  color: string
  baseColor?: string     // original color before cluster/origin override
  isPending?: boolean    // true while embedding is in-flight
  source?: string        // document name (for imported docs)
  fullText?: string      // full passage (for imported docs; text is the short label)
  origin?: PointOrigin   // who surfaced this point (colours the knowledge-explorer view)
}

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ColorBy = 'default' | 'origin' | 'cluster'

export interface ContextMenuState {
  x: number
  y: number
  pointId: string
}


export type WorkerIncoming = { type: 'embed'; text: string; id: string }

export type WorkerOutgoing =
  | { type: 'status'; status: ModelStatus; progress?: number }
  | { type: 'result'; id: string; embedding: number[] }
  | { type: 'error'; id?: string; message: string }
