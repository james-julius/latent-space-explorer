import type { ModelStatus } from '@/lib/types'

// Identity of an embedding space. Two points are comparable iff they share this
// string. Encodes model name + dim so a variant at a different dim is a new space.
export type EmbeddingModelId = string // e.g. "bge-small-en-v1.5@384"

export interface EmbedProvider {
  readonly id: string
  readonly embeddingModel: EmbeddingModelId
  readonly dim: number
  embed(text: string): Promise<number[]>
  status(): ModelStatus
  onStatus?(cb: (s: ModelStatus, progress: number) => void): () => void
}

export type KnowledgeProviderId = 'anthropic' | 'openai' | 'gemini' | 'ollama'

export interface KnowledgeProvider {
  readonly id: KnowledgeProviderId
  expand(concept: string): Promise<string[]>
  bridge(a: string, b: string): Promise<string[]>
}

export type ProviderErrorKind =
  | 'no-key' | 'auth' | 'rate-limit' | 'cors' | 'network' | 'parse' | 'aborted'

export class ProviderError extends Error {
  constructor(
    public kind: ProviderErrorKind,
    public providerId: string,
    message: string,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}
