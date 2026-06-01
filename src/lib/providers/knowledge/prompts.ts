// Shared prompt builders + response parser for all knowledge providers.
// Adapters differ only in transport; prompt + parsing logic lives here so the
// behaviour matches the original Ollama implementation exactly.

export function buildExpandPrompt(term: string): string {
  return (
    `List 8 diverse words or short phrases that are semantically related to "${term}". ` +
    `Return ONLY a valid JSON array of strings with no explanation. ` +
    `Example: ["concept one", "idea two", "word three"]`
  )
}

export function buildBridgePrompt(termA: string, termB: string): string {
  return (
    `List exactly 5 concepts that form a semantic bridge between "${termA}" and "${termB}". ` +
    `The concepts should progress gradually from being close to "${termA}" toward "${termB}". ` +
    `Return ONLY a valid JSON array of 5 strings. No explanation.`
  )
}

// Strip any <think>…</think> reasoning preamble, then pull the first JSON array.
export function parseConceptArray(raw: string, opts?: { exclude?: string; limit?: number }): string[] {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const match = clean.match(/\[[\s\S]*?\]/)
  if (!match) return []
  let parsed: unknown
  try { parsed = JSON.parse(match[0]) } catch { return [] }
  if (!Array.isArray(parsed)) return []
  const exclude = opts?.exclude?.toLowerCase()
  return (parsed as unknown[])
    .map(s => String(s).trim())
    .filter(s => s.length > 0 && (!exclude || s.toLowerCase() !== exclude))
    .slice(0, opts?.limit ?? 8)
}
