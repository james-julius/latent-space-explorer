// Build-time pre-seed pipeline.
//
//   node scripts/seed.mjs   (or: npm run seed)
//
// Embeds every curated term with bge-small (the SAME model + options the runtime
// worker uses), projects to 3D with a SEEDED UMAP (deterministic), int8-quantizes
// the embeddings, and writes static scenes to public/scenes/. Commit the output so
// deploys don't need the model download.

import { pipeline, env } from '@xenova/transformers'
import { UMAP } from 'umap-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SCENES } from './seed-topics.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'scenes')
const MODEL = 'Xenova/bge-small-en-v1.5'
const EMBEDDING_MODEL = 'bge-small-en-v1.5@384'
const DIM = 384
const SEED = 42
const BATCH = 64

env.cacheDir = join(ROOT, '.model-cache')

// Deterministic PRNG so UMAP output is reproducible across builds.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

async function embedAll(extractor, texts) {
  const out = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const t = await extractor(batch, { pooling: 'mean', normalize: true })
    const rows = t.tolist() // [batch][384]
    for (const row of rows) out.push(row)
    process.stdout.write(`\r  embedded ${Math.min(i + BATCH, texts.length)}/${texts.length}`)
  }
  process.stdout.write('\n')
  return out
}

// Replicates the exact center/scale math in src/lib/umap.ts projectToPositions,
// so seed positions are visually consistent with runtime-projected additions.
function project(embeddings) {
  const n = embeddings.length
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: Math.min(15, n - 1),
    minDist: 0.3,
    spread: 3.0,
    nEpochs: n < 500 ? 400 : 250,
    random: mulberry32(SEED),
  })
  const result = umap.fit(embeddings)
  const allVals = result.flat()
  const min = Math.min(...allVals)
  const max = Math.max(...allVals)
  const mid = (min + max) / 2
  const scale = 7 / (max - min || 1)
  return result.map(([x, y, z]) => [
    +((x - mid) * scale).toFixed(4),
    +((y - mid) * scale).toFixed(4),
    +((z - mid) * scale).toFixed(4),
  ])
}

// Symmetric int8: components of a normalized vector live in [-1, 1].
function quantize(vec) {
  return vec.map(v => Math.max(-127, Math.min(127, Math.round(v * 127))))
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  console.log(`Loading ${MODEL} …`)
  const extractor = await pipeline('feature-extraction', MODEL)

  const index = []
  for (const scene of SCENES) {
    console.log(`\nScene: ${scene.title}`)
    const terms = []
    for (const topic of scene.topics) {
      for (const term of topic.terms) terms.push({ term, topicId: topic.topicId })
    }
    const embeddings = await embedAll(extractor, terms.map(t => t.term))
    console.log('  projecting (UMAP)…')
    const positions = project(embeddings)

    const points = terms.map((t, i) => ({
      id: `seed-${scene.sceneId}-${i}`,
      text: t.term,
      position: positions[i],
      topicId: t.topicId,
      origin: 'preset',
      emb: quantize(embeddings[i]),
    }))

    const file = {
      schemaVersion: 1,
      sceneId: scene.sceneId,
      title: scene.title,
      description: scene.description,
      embeddingModel: EMBEDDING_MODEL,
      dim: DIM,
      quantization: 'int8',
      seed: SEED,
      count: points.length,
      points,
    }
    await writeFile(join(OUT_DIR, `${scene.sceneId}.json`), JSON.stringify(file))
    console.log(`  wrote public/scenes/${scene.sceneId}.json (${points.length} pts)`)
    index.push({
      sceneId: scene.sceneId,
      title: scene.title,
      description: scene.description,
      count: points.length,
      dim: DIM,
      embeddingModel: EMBEDDING_MODEL,
    })
  }

  await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2))
  console.log(`\nWrote public/scenes/index.json (${index.length} scenes)`)
}

main().catch(e => { console.error(e); process.exit(1) })
