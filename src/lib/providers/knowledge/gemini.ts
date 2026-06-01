import type { KnowledgeProvider } from '../types'
import { ProviderError } from '../types'
import { buildExpandPrompt, buildBridgePrompt, parseConceptArray } from './prompts'
import { mapStatus } from './http'

const MODEL = 'gemini-2.0-flash'

export function createGeminiProvider(key: string | null): KnowledgeProvider {
  async function generate(prompt: string): Promise<string> {
    if (!key) throw new ProviderError('no-key', 'gemini', 'No Gemini API key set')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      })
    } catch (e) {
      throw new ProviderError('cors', 'gemini', `Network error reaching Gemini: ${e}`)
    }
    if (!res.ok) throw mapStatus('gemini', res.status)
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  return {
    id: 'gemini',
    expand: async (c) => parseConceptArray(await generate(buildExpandPrompt(c)), { exclude: c, limit: 8 }),
    bridge: async (a, b) => parseConceptArray(await generate(buildBridgePrompt(a, b)), { limit: 5 }),
  }
}
