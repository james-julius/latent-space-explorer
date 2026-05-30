// Golden-ratio hue stepping for visually distinct, aesthetically pleasing colors
const GOLDEN_RATIO = 0.618033988749895

export function pointColor(index: number): string {
  const hue = ((index * GOLDEN_RATIO) % 1) * 360
  return `hsl(${hue.toFixed(0)}, 80%, 65%)`
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
