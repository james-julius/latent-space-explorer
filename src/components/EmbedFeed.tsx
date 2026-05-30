'use client'

interface Props {
  pendingCount: number
}

export function EmbedFeed({ pendingCount }: Props) {
  if (pendingCount === 0) return null

  return (
    <div className="absolute top-10 right-3 z-10 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur border border-white/8">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#fbbf24]" />
      <span className="text-white/50 text-xs font-mono">
        generating {pendingCount} point{pendingCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
