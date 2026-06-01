import type { KnowledgeProvider } from '../types'
import { ProviderError } from '../types'
import { buildExpandPrompt, buildBridgePrompt, parseConceptArray } from './prompts'
import { mapStatus } from './http'

const MODEL = 'claude-haiku-4-5-20251001'

export function createAnthropicProvider(key: string | null): KnowledgeProvider {
  async function generate(prompt: string): Promise<string> {
    if (!key) throw new ProviderError('no-key', 'anthropic', 'No Anthropic API key set')
    let res: Response
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          // Required for direct browser calls, else CORS preflight blocks it.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
    } catch (e) {
      throw new ProviderError('cors', 'anthropic', `Network/CORS error reaching Anthropic: ${e}`)
    }
    if (!res.ok) throw mapStatus('anthropic', res.status)
    const data = await res.json()
    return data?.content?.[0]?.text ?? ''
  }

  return {
    id: 'anthropic',
    expand: async (c) => parseConceptArray(await generate(buildExpandPrompt(c)), { exclude: c, limit: 8 }),
    bridge: async (a, b) => parseConceptArray(await generate(buildBridgePrompt(a, b)), { limit: 5 }),
  }
}
