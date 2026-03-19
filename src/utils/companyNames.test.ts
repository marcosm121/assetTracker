import { getCompanyName } from './companyNames'

describe('getCompanyName', () => {
  it('returns the company name for a known ticker', () => {
    expect(getCompanyName('GGAL')).toBe('Grupo Financiero Galicia')
  })

  it('returns empty string for an unknown ticker', () => {
    expect(getCompanyName('UNKNOWN')).toBe('')
  })

  it('is case-sensitive (tickers are always uppercase)', () => {
    expect(getCompanyName('ggal')).toBe('')
  })
})
