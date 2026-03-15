import { describe, it, expect, beforeEach } from 'vitest'
import { saveAuth, loadAuth, clearAuth, saveWatchlist, loadWatchlist, savePreferences, loadPreferences } from './storage'
import type { WatchlistItem } from '../adapters/types'

beforeEach(() => localStorage.clear())

describe('auth storage', () => {
  it('saves and loads auth', () => {
    const auth = { access_token: 'tok', refresh_token: 'ref', expires_at: 9999999 }
    saveAuth(auth)
    expect(loadAuth()).toEqual(auth)
  })

  it('clears auth', () => {
    saveAuth({ access_token: 'tok', refresh_token: 'ref', expires_at: 9999999 })
    clearAuth()
    expect(loadAuth()).toBeNull()
  })
})

describe('watchlist storage', () => {
  it('saves and loads watchlist', () => {
    const items: WatchlistItem[] = [{ symbol: 'GGAL', market: 'bCBA', label: 'Galicia' }]
    saveWatchlist(items)
    expect(loadWatchlist()).toEqual(items)
  })

  it('returns empty array when nothing saved', () => {
    expect(loadWatchlist()).toEqual([])
  })
})

describe('preferences storage', () => {
  it('saves and loads variation period preference', () => {
    savePreferences({ variationPeriod: '1m' })
    expect(loadPreferences().variationPeriod).toBe('1m')
  })

  it('defaults to 1d when nothing saved', () => {
    expect(loadPreferences().variationPeriod).toBe('1d')
  })
})
