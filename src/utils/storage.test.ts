import { describe, it, expect, beforeEach } from 'vitest'
import { saveWatchlist, loadWatchlist, savePreferences, loadPreferences } from './storage'

beforeEach(() => localStorage.clear())

describe('watchlist storage', () => {
  it('saves and loads a string array', () => {
    saveWatchlist(['GGAL', 'YPF'])
    expect(loadWatchlist()).toEqual(['GGAL', 'YPF'])
  })

  it('returns empty array when nothing saved', () => {
    expect(loadWatchlist()).toEqual([])
  })

  it('returns empty array on corrupted data', () => {
    localStorage.setItem('assets_tracker_watchlist', 'not-json')
    expect(loadWatchlist()).toEqual([])
  })
})

describe('preferences storage', () => {
  it('saves and loads variation period', () => {
    savePreferences({ variationPeriod: '1m' })
    expect(loadPreferences().variationPeriod).toBe('1m')
  })

  it('defaults to 1d when nothing saved', () => {
    expect(loadPreferences().variationPeriod).toBe('1d')
  })

  it('returns default on corrupted data', () => {
    localStorage.setItem('assets_tracker_preferences', 'not-json')
    expect(loadPreferences().variationPeriod).toBe('1d')
  })
})
