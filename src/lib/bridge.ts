import { OLLAMA_BASE } from './ollama'

async function getGenModel(): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`)
    const data = await res.json()
    const names: string[] = data.models?.map((m: { name: string }) => m.name) ?? []
    const preferred = [
      'nemotron-3-nano', 'phi3', 'phi4-mini', 'llama3.2:1b', 'llama3.2:3b',
      'qwen2.5:1b', 'qwen2.5:3b', 'tinyllama', 'mistral',
    ]
    for (const p of preferred) {
      const found = names.find(n => n.startsWith(p))
      if (found) return found
    }
    return names.find(n => !n.startsWith('nomic-embed')) ?? null
  } catch { return null }
}

// Generate 5 concepts that bridge semantically between termA and termB.
export async function generateBridgeConcepts(
  termA: string, termB: string
): Promise<string[]> {
  const model = await getGenModel()
  if (!model) return []

  const prompt =
    `List exactly 5 concepts that form a semantic bridge between "${termA}" and "${termB}". ` +
    `The concepts should progress gradually from being close to "${termA}" toward "${termB}". ` +
    `Return ONLY a valid JSON array of 5 strings. No explanation.`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, think: false }),
    })
    const data = await res.json()
    const raw: string = data.response ?? ''
    const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    const match = clean.match(/\[[\s\S]*?\]/)
    if (!match) return []
    const parsed: unknown = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return (parsed as unknown[]).map(s => String(s).trim()).filter(Boolean).slice(0, 5)
  } catch { return [] }
}
