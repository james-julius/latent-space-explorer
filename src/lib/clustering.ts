function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

// k-means clustering using cosine similarity on high-dim embeddings.
// Returns an array of cluster indices (0..k-1), one per input vector.
export function kMeans(vectors: number[][], k: number, maxIter = 20): number[] {
  const n = vectors.length
  if (n === 0) return []
  if (n <= k) return vectors.map((_, i) => i % k)

  // K-means++ initialisation for better convergence
  const centroids: number[][] = []
  centroids.push([...vectors[Math.floor(Math.random() * n)]])
  while (centroids.length < k) {
    const dists = vectors.map(v =>
      Math.min(...centroids.map(c => 1 - cosineSim(v, c)))
    )
    const total = dists.reduce((s, d) => s + d, 0)
    let r = Math.random() * total
    for (let i = 0; i < n; i++) {
      r -= dists[i]
      if (r <= 0) { centroids.push([...vectors[i]]); break }
    }
    if (centroids.length < k) centroids.push([...vectors[n - 1]])
  }

  let labels = new Array(n).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    const newLabels = vectors.map(v => {
      let best = 0, bestSim = -Infinity
      for (let c = 0; c < k; c++) {
        const s = cosineSim(v, centroids[c])
        if (s > bestSim) { bestSim = s; best = c }
      }
      return best
    })
    if (newLabels.every((l, i) => l === labels[i])) break
    labels = newLabels

    for (let c = 0; c < k; c++) {
      const members = vectors.filter((_, i) => labels[i] === c)
      if (!members.length) continue
      const dim = vectors[0].length
      centroids[c] = Array.from({ length: dim }, (_, d) =>
        members.reduce((s, v) => s + v[d], 0) / members.length
      )
    }
  }

  return labels
}

export const CLUSTER_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#ff922b', '#cc5de8', '#20c997', '#f06595',
  '#74c0fc', '#a9e34b', '#ff8787', '#63e6be',
]
