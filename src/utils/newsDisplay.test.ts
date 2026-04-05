import { describe, it, expect, vi, afterEach } from 'vitest'
import { relativeTime, CATEGORY_LABELS, CATEGORY_COLORS } from './newsDisplay'

describe('relativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "hace Xm" for times less than 60 minutes ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T14:30:00Z'))
    expect(relativeTime('2026-04-04T14:00:00Z')).toBe('hace 30m')
  })

  it('returns "hace Xh" for times between 1 and 24 hours ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T16:00:00Z'))
    expect(relativeTime('2026-04-04T14:00:00Z')).toBe('hace 2h')
  })

  it('returns "hace Xd" for times more than 24 hours ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T14:00:00Z'))
    expect(relativeTime('2026-04-04T14:00:00Z')).toBe('hace 2d')
  })
})

describe('CATEGORY_LABELS', () => {
  it('has correct labels for all categories', () => {
    expect(CATEGORY_LABELS.argentina).toBe('Argentina')
    expect(CATEGORY_LABELS.global).toBe('Global')
    expect(CATEGORY_LABELS.geopolitics).toBe('Geopolítica')
    expect(CATEGORY_LABELS.watchlist).toBe('Watchlist')
  })
})

describe('CATEGORY_COLORS', () => {
  it('has a color class for all categories', () => {
    expect(CATEGORY_COLORS.argentina).toContain('blue')
    expect(CATEGORY_COLORS.global).toContain('green')
    expect(CATEGORY_COLORS.geopolitics).toContain('orange')
    expect(CATEGORY_COLORS.watchlist).toContain('purple')
  })
})
