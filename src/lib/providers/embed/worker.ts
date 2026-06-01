import { embedClient } from '@/lib/embedClient'
import type { EmbedProvider } from '@/lib/providers/types'

// Default embedder: bge-small-en-v1.5 running in-browser via the worker.
// Free, no key, no install. 384-dim. This is the canonical free space.
export const browserBgeProvider: EmbedProvider = {
  id: 'browser-bge',
  embeddingModel: 'bge-small-en-v1.5@384',
  dim: 384,
  embed: (t) => embedClient.embed(t),
  status: () => embedClient.status(),
  onStatus: (cb) => embedClient.onStatus(cb),
}
