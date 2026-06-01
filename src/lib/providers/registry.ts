import type { KnowledgeProvider, KnowledgeProviderId } from './types'
import type { PointOrigin } from '@/lib/types'
import { createAnthropicProvider } from './knowledge/anthropic'
import { createOpenAIProvider } from './knowledge/openai'
import { createGeminiProvider } from './knowledge/gemini'
import { createOllamaProvider } from './knowledge/ollama'

export interface KnowledgeProviderDescriptor {
  id: KnowledgeProviderId
  label: string
  requiresKey: boolean
  keyHelpUrl?: string
  origin: PointOrigin // how points it surfaces are tagged/coloured
}

export const KNOWLEDGE_PROVIDERS: KnowledgeProviderDescriptor[] = [
  { id: 'anthropic', label: 'Claude', requiresKey: true, keyHelpUrl: 'https://console.anthropic.com/settings/keys', origin: 'claude' },
  { id: 'openai', label: 'ChatGPT', requiresKey: true, keyHelpUrl: 'https://platform.openai.com/api-keys', origin: 'gpt' },
  { id: 'gemini', label: 'Gemini', requiresKey: true, keyHelpUrl: 'https://aistudio.google.com/app/apikey', origin: 'gemini' },
  { id: 'ollama', label: 'Ollama (local)', requiresKey: false, origin: 'user' },
]

export function getKnowledgeDescriptor(id: KnowledgeProviderId): KnowledgeProviderDescriptor {
  return KNOWLEDGE_PROVIDERS.find(p => p.id === id) ?? KNOWLEDGE_PROVIDERS[3]
}

export function getKnowledgeProvider(id: KnowledgeProviderId, key: string | null): KnowledgeProvider {
  switch (id) {
    case 'anthropic': return createAnthropicProvider(key)
    case 'openai': return createOpenAIProvider(key)
    case 'gemini': return createGeminiProvider(key)
    case 'ollama': default: return createOllamaProvider()
  }
}
