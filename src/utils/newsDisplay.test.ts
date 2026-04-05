import { describe, it, expect, vi, afterEach } from 'vitest'
import { relativeTime } from './newsDisplay'

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
