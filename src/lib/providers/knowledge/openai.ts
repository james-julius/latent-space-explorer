import type { KnowledgeProvider } from '../types'
import { ProviderError } from '../types'
import { buildExpandPrompt, buildBridgePrompt, parseConceptArray } from './prompts'
import { mapStatus } from './http'

const MODEL = 'gpt-4o-mini'

export function createOpenAIProvider(key: string | null): KnowledgeProvider {
  async function generate(prompt: string): Promise<string> {
    if (!key) throw new ProviderError('no-key', 'openai', 'No OpenAI API key set')
    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      })
    } catch (e) {
      throw new ProviderError('cors', 'openai', `Network error reaching OpenAI: ${e}`)
    }
    if (!res.ok) throw mapStatus('openai', res.status)
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ''
  }

  return {
    id: 'openai',
    expand: async (c) => parseConceptArray(await generate(buildExpandPrompt(c)), { exclude: c, limit: 8 }),
    bridge: async (a, b) => parseConceptArray(await generate(buildBridgePrompt(a, b)), { limit: 5 }),
  }
}
