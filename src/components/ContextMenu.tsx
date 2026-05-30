'use client'

import { useEffect, useRef } from 'react'

export interface ContextAction {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  x: number
  y: number
  actions: ContextAction[]
  onClose: () => void
}

export function ContextMenu({ x, y, actions, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  // Keep menu on screen
  const left = Math.min(x, window.innerWidth - 180)
  const top = Math.min(y, window.innerHeight - actions.length * 36 - 16)

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left, top, zIndex: 100 }}
      className="bg-black/90 backdrop-blur border border-white/15 rounded-xl py-1 shadow-2xl min-w-[160px]"
    >
      {actions.map(action => (
        <button
          key={action.label}
          onClick={() => { if (!action.disabled) { action.onClick(); onClose() } }}
          disabled={action.disabled}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-mono
            text-white/70 hover:text-white hover:bg-white/8 transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed text-left"
        >
          <span className="text-base">{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  )
}
