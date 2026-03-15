import { describe, it, expect } from 'vitest'
import { calcVariation } from './variation'

describe('calcVariation', () => {
  it('returns positive percentage when price increased', () => {
    expect(calcVariation(110, 100)).toBeCloseTo(10.0)
  })

  it('returns negative percentage when price decreased', () => {
    expect(calcVariation(90, 100)).toBeCloseTo(-10.0)
  })

  it('returns 0 when prices are equal', () => {
    expect(calcVariation(100, 100)).toBe(0)
  })

  it('returns null when reference price is 0 or missing', () => {
    expect(calcVariation(100, 0)).toBeNull()
    expect(calcVariation(100, undefined)).toBeNull()
  })
})
