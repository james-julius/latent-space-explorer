import type { ModelStatus } from '@/lib/types'

// Loads bge-small-en-v1.5 via transformers.js on the main thread (dynamic import,
// client-only). Single short-text embeds are fast (~tens of ms); the model load is
// async and non-blocking. Same public surface a worker bridge would expose.
type Extractor = (
  text: string,
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array }>

class EmbedClient {
  private extractor: Extractor | null = null
  private loadPromise: Promise<void> | null = null
  private _status: ModelStatus = 'idle'
  private _progress = 0
  private listeners = new Set<(s: ModelStatus, p: number) => void>()

  private ensure(): Promise<void> {
    if (this.loadPromise) return this.loadPromise
    if (typeof window === 'undefined') return Promise.resolve()
    this._status = 'loading'
    this.emit()
    this.loadPromise = (async () => {
      try {
        // Import the prebuilt dist bundle directly — the package's default `main`
        // points at ./src which crashes under Turbopack at module-eval.
        const { pipeline, env } = await import('@xenova/transformers/dist/transformers.js')
        env.allowLocalModels = false
        env.useBrowserCache = true
        const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
          progress_callback: (info: { progress?: number }) => {
            this._progress = Math.round(info.progress ?? 0)
            this._status = 'loading'
            this.emit()
          },
        })
        this.extractor = extractor as unknown as Extractor
        this._status = 'ready'
        this.emit()
      } catch (e) {
        console.error('[embedder] model load failed:', e)
        this._status = 'error'
        this.emit()
        throw e
      }
    })()
    return this.loadPromise
  }

  private emit() {
    for (const l of this.listeners) l(this._status, this._progress)
  }

  /** Begin loading the model eagerly without embedding anything. */
  warmup() { void this.ensure().catch(() => {}) }

  async embed(text: string): Promise<number[]> {
    await this.ensure()
    if (!this.extractor) throw new Error('embedder unavailable')
    const out = await this.extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(out.data as Float32Array)
  }

  status() { return this._status }
  progress() { return this._progress }

  onStatus(cb: (s: ModelStatus, p: number) => void) {
    this.listeners.add(cb)
    cb(this._status, this._progress)
    return () => { this.listeners.delete(cb) }
  }
}

export const embedClient = new EmbedClient()
