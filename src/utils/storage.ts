import type { VariationPeriod } from '../adapters/types'

interface Preferences {
  variationPeriod: VariationPeriod
}

const KEYS = {
  WATCHLIST: 'assets_tracker_watchlist',
  PREFERENCES: 'assets_tracker_preferences',
}

export function saveWatchlist(items: string[]): void {
  localStorage.setItem(KEYS.WATCHLIST, JSON.stringify(items))
}

export function loadWatchlist(): string[] {
  const raw = localStorage.getItem(KEYS.WATCHLIST)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function savePreferences(prefs: Partial<Preferences>): void {
  const current = loadPreferences()
  localStorage.setItem(KEYS.PREFERENCES, JSON.stringify({ ...current, ...prefs }))
}

export function loadPreferences(): Preferences {
  const raw = localStorage.getItem(KEYS.PREFERENCES)
  if (!raw) return { variationPeriod: '1d' }
  try {
    return JSON.parse(raw)
  } catch {
    return { variationPeriod: '1d' }
  }
}
