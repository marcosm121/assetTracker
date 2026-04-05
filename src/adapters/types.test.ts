import { describe, it, expectTypeOf } from 'vitest'
import type { DataProvider, TickerPriceMap, TickerHistoryMap, DollarRates } from './types'

describe('DataProvider interface', () => {
  it('enforces correct method signatures', () => {
    const mock: DataProvider = {
      fetchAll: async () => {},
      getPrices: (): TickerPriceMap => ({ GGAL: { ars: 1234, usd: 0.95 } }),
      getHistoryPrices: (): TickerHistoryMap => ({ GGAL: { ars: 1200, usd: 0.93 } }),
      getAllHistoryPrices: () => ({
        '1d': {}, '1w': {}, '1m': {}, '3m': {},
      }),
      getWatchlist: () => ['GGAL'],
      getDollarRates: (): DollarRates => ({ oficial: 1180, blue: 1350, bolsa: 1290, contadoconliqui: 1310 }),
      getHistoryDollarRates: (): DollarRates => ({ oficial: 1100, blue: null, bolsa: null, contadoconliqui: null }),
      addTicker: async (_s: string) => {},
      removeTicker: async (_s: string) => {},
      isReady: () => true,
      fetchNews: async () => {},
      getNews: () => [],
    }
    expectTypeOf(mock).toMatchTypeOf<DataProvider>()
  })
})
