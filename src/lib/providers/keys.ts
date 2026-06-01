import type { KnowledgeProviderId } from './types'

// BYOK keys live ONLY in localStorage and are sent ONLY to that provider's own
// endpoint. Never logged, never sent anywhere else.
const KEY_PREFIX = 'lse-key-'

export function getKey(id: KnowledgeProviderId): string | null {
  try { return localStorage.getItem(KEY_PREFIX + id) } catch { return null }
}

export function setKey(id: KnowledgeProviderId, key: string): void {
  try {
    if (key) localStorage.setItem(KEY_PREFIX + id, key)
    else localStorage.removeItem(KEY_PREFIX + id)
  } catch { /* quota / unavailable */ }
}

export function clearKey(id: KnowledgeProviderId): void {
  try { localStorage.removeItem(KEY_PREFIX + id) } catch { /* ignore */ }
}
