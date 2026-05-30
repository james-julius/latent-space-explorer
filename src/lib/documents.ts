export interface Chunk {
  text: string      // short label (first ~60 chars of passage)
  fullText: string  // full passage shown in info panel
  source: string    // document name
  index: number     // chunk number within document
}

const MAX_WORDS = 150
const MIN_WORDS = 20

// Split text into chunks, preferring paragraph boundaries.
// Falls back to word-count splitting when paragraphs are too long.
export function chunkText(raw: string, sourceName: string): Chunk[] {
  // Strip markdown headings/links/bold roughly, keep plain text
  const cleaned = raw
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
    .replace(/^\s*[-*+]\s+/gm, '')     // bullets
    .trim()

  // Split on blank lines (paragraph boundaries)
  const paragraphs = cleaned.split(/\n{2,}/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean)

  const chunks: Chunk[] = []
  let buffer: string[] = []

  const flush = () => {
    const passage = buffer.join(' ').trim()
    buffer = []
    if (passage.split(/\s+/).length < MIN_WORDS) return // skip tiny fragments
    const label = passage.split(/\s+/).slice(0, 10).join(' ') + (passage.split(/\s+/).length > 10 ? '…' : '')
    chunks.push({
      text: label,
      fullText: passage,
      source: sourceName,
      index: chunks.length,
    })
  }

  for (const para of paragraphs) {
    const words = para.split(/\s+/)

    if (words.length > MAX_WORDS) {
      // Long paragraph — split by words
      if (buffer.length) flush()
      for (let i = 0; i < words.length; i += MAX_WORDS) {
        const slice = words.slice(i, i + MAX_WORDS).join(' ')
        buffer = [slice]
        flush()
      }
    } else {
      buffer.push(para)
      const wordCount = buffer.join(' ').split(/\s+/).length
      if (wordCount >= MAX_WORDS) flush()
    }
  }
  if (buffer.join(' ').split(/\s+/).length >= MIN_WORDS) flush()

  return chunks
}

// Read a File object as text (browser File API)
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}
