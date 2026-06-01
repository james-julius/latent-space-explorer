// Golden-ratio hue stepping for visually distinct, aesthetically pleasing colors
const GOLDEN_RATIO = 0.618033988749895

export function pointColor(index: number): string {
  const hue = ((index * GOLDEN_RATIO) % 1) * 360
  return `hsl(${hue.toFixed(0)}, 80%, 65%)`
}

// Colour points by which model/source surfaced them — the knowledge-explorer view.
export const ORIGIN_COLORS: Record<string, string> = {
  claude: '#d97757', // anthropic clay
  gpt:    '#10a37f', // openai green
  gemini: '#4285f4', // google blue
  user:   '#ffffff', // your own
  import: '#ffd93d', // imported docs
  preset: '#8a8a8a', // the shared seed substrate
}

export function originColor(origin?: string): string {
  return ORIGIN_COLORS[origin ?? 'preset'] ?? ORIGIN_COLORS.preset
}

export function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!match) return '#ffffff'
  const h = parseInt(match[1]) / 360
  const s = parseInt(match[2]) / 100
  const l = parseInt(match[3]) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}
