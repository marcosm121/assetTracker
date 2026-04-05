import type { NewsCategory } from '../adapters/types'

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  argentina: 'Argentina',
  global: 'Global',
  geopolitics: 'Geopolítica',
  watchlist: 'Watchlist',
}

export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  argentina: 'bg-blue-100 text-blue-700',
  global: 'bg-green-100 text-green-700',
  geopolitics: 'bg-orange-100 text-orange-700',
  watchlist: 'bg-purple-100 text-purple-700',
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `hace ${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  return `hace ${Math.floor(diffHours / 24)}d`
}
