import { describe, it, expectTypeOf } from 'vitest'
import type { MarketDataProvider, Quote, HistoryPoint, SymbolResult } from './types'

describe('MarketDataProvider interface', () => {
  it('enforces correct return types', () => {
    const mock: MarketDataProvider = {
      login: async (_u, _p) => {},
      refreshAuth: async () => {},
      isAuthenticated: () => true,
      getQuote: async (_s, _m): Promise<Quote> => ({
        symbol: 'GGAL', market: 'bCBA', price: 100, timestamp: new Date()
      }),
      getHistory: async (_s, _m, _f, _t): Promise<HistoryPoint[]> => [],
      searchSymbol: async (_q): Promise<SymbolResult[]> => [],
    }
    expectTypeOf(mock).toMatchTypeOf<MarketDataProvider>()
  })
})
