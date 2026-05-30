'use client'

import { useEffect, useRef } from 'react'
import type { FeedItem } from '@/lib/types'

interface Props {
  items: FeedItem[]
}

export function EmbedFeed({ items }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new items arrive
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items.length])

  if (items.length === 0) return null

  return (
    <div className="absolute top-10 right-3 z-10 w-64 pointer-events-none">
      <div
        ref={listRef}
        className="flex flex-col gap-0.5 overflow-hidden"
        style={{ maxHeight: '40vh' }}
      >
        {items.map(item => (
          <FeedRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function FeedRow({ item }: { item: FeedItem }) {
  const isDone = item.status === 'done'

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded transition-all duration-300 ${
        isDone ? 'opacity-40' : 'opacity-90'
      }`}
      style={{
        background: isDone ? 'transparent' : 'rgba(0,0,0,0.55)',
        border: isDone ? 'none' : '1px solid rgba(255,255,255,0.07)',
        backdropFilter: isDone ? undefined : 'blur(4px)',
      }}
    >
      {/* Status indicator */}
      {isDone ? (
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: item.color, boxShadow: `0 0 4px ${item.color}` }}
        />
      ) : (
        <div className="flex-shrink-0 relative w-2 h-2">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: item.color, opacity: 0.4 }}
          />
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: item.color, transform: 'scale(0.6)' }}
          />
        </div>
      )}

      {/* Text */}
      <span
        className="text-xs font-mono truncate"
        style={{
          color: isDone ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
          fontStyle: isDone ? 'normal' : 'italic',
        }}
      >
        {item.text}
      </span>
    </div>
  )
}
