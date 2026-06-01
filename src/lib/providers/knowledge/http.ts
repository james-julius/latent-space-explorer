import { ProviderError, type ProviderErrorKind } from '../types'

export function mapStatus(providerId: string, status: number): ProviderError {
  let kind: ProviderErrorKind = 'network'
  if (status === 401 || status === 403) kind = 'auth'
  else if (status === 429) kind = 'rate-limit'
  return new ProviderError(kind, providerId, `${providerId} request failed (${status})`)
}
