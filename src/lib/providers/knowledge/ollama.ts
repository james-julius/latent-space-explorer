import type { KnowledgeProvider } from '../types'
import { generateRelated } from '@/lib/ollama'
import { generateBridgeConcepts } from '@/lib/bridge'

// Local Ollama generation. No key; gracefully returns [] when Ollama isn't
// running. Default knowledge provider until the user adds a BYOK key.
export function createOllamaProvider(): KnowledgeProvider {
  return {
    id: 'ollama',
    expand: (c) => generateRelated(c),
    bridge: (a, b) => generateBridgeConcepts(a, b),
  }
}
