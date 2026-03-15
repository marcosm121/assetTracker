import type { WatchlistItem, VariationPeriod } from '../adapters/types'

interface AuthData {
  access_token: string
  refresh_token: string
  expires_at: number
}

interface Preferences {
  variationPeriod: VariationPeriod
}

const KEYS = {
  AUTH: 'assets_tracker_auth',
  WATCHLIST: 'assets_tracker_watchlist',
  PREFERENCES: 'assets_tracker_preferences',
}

export function saveAuth(auth: AuthData): void {
  localStorage.setItem(KEYS.AUTH, JSON.stringify(auth))
}

export function loadAuth(): AuthData | null {
  const raw = localStorage.getItem(KEYS.AUTH)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearAuth(): void {
  localStorage.removeItem(KEYS.AUTH)
}

export function saveWatchlist(items: WatchlistItem[]): void {
  localStorage.setItem(KEYS.WATCHLIST, JSON.stringify(items))
}

export function loadWatchlist(): WatchlistItem[] {
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
