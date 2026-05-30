import { pipeline, env } from '@xenova/transformers'
import type { FeatureExtractionPipeline } from '@xenova/transformers'
import type { WorkerIncoming, WorkerOutgoing } from '@/lib/types'

// Use HuggingFace CDN, cache in IndexedDB
env.allowLocalModels = false
env.useBrowserCache = true

let extractor: FeatureExtractionPipeline | null = null

function post(msg: WorkerOutgoing) {
  self.postMessage(msg)
}

async function loadModel() {
  post({ type: 'status', status: 'loading', progress: 0 })
  extractor = (await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
    progress_callback: (info: { progress?: number }) => {
      post({ type: 'status', status: 'loading', progress: info.progress ?? 0 })
    },
  })) as FeatureExtractionPipeline
  post({ type: 'status', status: 'ready' })
}

async function embed(text: string, id: string) {
  if (!extractor) {
    post({ type: 'error', message: 'Model not loaded' })
    return
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output: any = await extractor(text, { pooling: 'mean', normalize: true })
    const embedding = Array.from(output.data as Float32Array) as number[]
    post({ type: 'result', id, embedding })
  } catch (e) {
    post({ type: 'error', message: String(e) })
  }
}

self.onmessage = async (e: MessageEvent<WorkerIncoming>) => {
  const { type } = e.data
  if (type === 'embed') {
    await embed(e.data.text, e.data.id)
  }
}

// Auto-load model on worker start
loadModel()
