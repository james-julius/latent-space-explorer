export const OLLAMA_BASE = 'http://localhost:11434'
export const EMBED_MODEL = 'nomic-embed-text'

export async function ollamaEmbed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  })
  if (!res.ok) throw new Error(`Ollama embed error ${res.status}`)
  const data = await res.json()
  return data.embedding as number[]
}

export async function isEmbedModelAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`)
    const data = await res.json()
    return data.models?.some((m: { name: string }) =>
      m.name.startsWith(EMBED_MODEL)
    ) ?? false
  } catch {
    return false
  }
}

export async function pullModel(onProgress: (pct: number) => void): Promise<void> {
  const res = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL }),
  })
  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
      try {
        const json = JSON.parse(line)
        if (json.total && json.completed) onProgress(Math.round((json.completed / json.total) * 100))
        else if (json.status === 'success') onProgress(100)
      } catch { /* partial line */ }
    }
  }
}

// Pick the fastest available model for text generation
async function getGenModel(): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`)
    const data = await res.json()
    const names: string[] = data.models?.map((m: { name: string }) => m.name) ?? []
    // Prefer small/fast models; fall back to whatever is installed
    const preferred = [
      'nemotron-3-nano', 'phi3', 'phi4-mini', 'llama3.2:1b', 'llama3.2:3b',
      'qwen2.5:1b', 'qwen2.5:3b', 'tinyllama', 'mistral',
    ]
    for (const p of preferred) {
      const found = names.find(n => n.startsWith(p))
      if (found) return found
    }
    return names.find(n => !n.startsWith(EMBED_MODEL)) ?? null
  } catch {
    return null
  }
}

export async function generateRelated(term: string): Promise<string[]> {
  const model = await getGenModel()
  if (!model) return []

  const prompt =
    `List 8 diverse words or short phrases that are semantically related to "${term}". ` +
    `Return ONLY a valid JSON array of strings with no explanation. ` +
    `Example: ["concept one", "idea two", "word three"]`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // think:false disables reasoning preamble on Qwen3/deepseek models
      body: JSON.stringify({ model, prompt, stream: false, think: false }),
    })
    const data = await res.json()
    const raw: string = data.response ?? ''

    // Strip any <think>...</think> blocks, then find the JSON array
    const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    const match = clean.match(/\[[\s\S]*?\]/)
    if (!match) return []

    const parsed: unknown = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []

    return (parsed as unknown[])
      .map(s => String(s).trim())
      .filter(s => s.length > 0 && s.toLowerCase() !== term.toLowerCase())
      .slice(0, 8)
  } catch {
    return []
  }
}
