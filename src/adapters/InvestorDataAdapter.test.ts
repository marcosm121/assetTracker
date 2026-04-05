import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvestorDataAdapter, getOneDayHistoryDaysAgo } from './InvestorDataAdapter'

const BASE_URL = 'http://localhost:3000'

const MANYALL = {
  GGAL: { ars: 1234.56, usd: 0.9567 },
  YPF: { ars: 8900.00, usd: 6.8960 },
  oficial: 1180.50,
  blue: 1350.00,
  bolsa: 1290.75,
  contadoconliqui: 1310.25,
}

const HISTORY_FULL = {
  GGAL: { ars: 1200.00, usd: 0.9302 },
  YPF: { ars: 8500.00, usd: 6.5903 },
  oficial: 1150.00,
  blue: 1300.00,
  bolsa: 1270.00,
  contadoconliqui: 1290.00,
}

const HISTORY_PARTIAL = {
  GGAL: { ars: null, usd: null },
  YPF: { ars: 8600.00, usd: 6.6667 },
  oficial: null,
  blue: null,
  bolsa: null,
  contadoconliqui: null,
}

function mockFetchAll() {
  vi.mocked(fetch)
    .mockResolvedValueOnce({ ok: true, json: async () => MANYALL } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
}

describe('InvestorDataAdapter', () => {
  let adapter: InvestorDataAdapter

  beforeEach(() => {
    adapter = new InvestorDataAdapter(BASE_URL)
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('isReady', () => {
    it('returns false before fetchAll', () => {
      expect(adapter.isReady()).toBe(false)
    })

    it('returns true after successful fetchAll', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      expect(adapter.isReady()).toBe(true)
    })

    it('guarantees no additional network requests are needed after becoming ready', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      vi.mocked(fetch).mockClear()

      // Reading all data accessors should trigger zero additional fetches
      adapter.getPrices()
      adapter.getDollarRates()
      adapter.getHistoryPrices('1d')
      adapter.getHistoryDollarRates('1w')
      adapter.getWatchlist()

      expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    })
  })

  describe('fetchAll', () => {
    it('fires exactly 5 requests in parallel', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(5)
    })

    it('calls /manyall for current prices', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(`${BASE_URL}/manyall`)
    })

    it('calls /manyhistory with 4 different dates', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      const calls = vi.mocked(fetch).mock.calls.map(c => c[0] as string)
      const historyCalls = calls.filter(url => url.includes('/manyhistory/'))
      expect(historyCalls).toHaveLength(4)
      // all dates are different
      const dates = historyCalls.map(url => url.split('/manyhistory/')[1])
      expect(new Set(dates).size).toBe(4)
    })

    it('throws if /manyall returns non-ok', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)
      await expect(adapter.fetchAll()).rejects.toThrow()
    })

    it('uses 2-days-ago date for 1d period before 10:00 AM GMT-3', async () => {
      // Simulate 09:00 AM GMT-3 = 12:00 UTC
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-17T12:00:00Z')) // 09:00 AM GMT-3

      mockFetchAll()
      await adapter.fetchAll()

      const calls = vi.mocked(fetch).mock.calls.map(c => c[0] as string)
      const historyCalls = calls.filter(url => url.includes('/manyhistory/'))

      // 1d should be 2 days ago = 2026-03-15
      expect(historyCalls).toContainEqual(expect.stringContaining('/manyhistory/2026-03-15'))
      // 1d should NOT use 1 day ago = 2026-03-16
      expect(historyCalls).not.toContainEqual(expect.stringContaining('/manyhistory/2026-03-16'))

      vi.useRealTimers()
    })

    it('uses 1-day-ago date for 1d period after 10:00 AM GMT-3', async () => {
      // Simulate 11:00 AM GMT-3 = 14:00 UTC
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-17T14:00:00Z')) // 11:00 AM GMT-3

      mockFetchAll()
      await adapter.fetchAll()

      const calls = vi.mocked(fetch).mock.calls.map(c => c[0] as string)
      const historyCalls = calls.filter(url => url.includes('/manyhistory/'))

      // 1d should be 1 day ago = 2026-03-16
      expect(historyCalls).toContainEqual(expect.stringContaining('/manyhistory/2026-03-16'))

      vi.useRealTimers()
    })
  })

  describe('getWatchlist', () => {
    it('returns ticker symbols excluding dollar keys', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      const list = adapter.getWatchlist()
      expect(list).toContain('GGAL')
      expect(list).toContain('YPF')
      expect(list).not.toContain('oficial')
      expect(list).not.toContain('blue')
      expect(list).not.toContain('bolsa')
      expect(list).not.toContain('contadoconliqui')
    })
  })

  describe('getPrices', () => {
    it('returns TickerPriceMap with ars and usd per ticker', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      const prices = adapter.getPrices()
      expect(prices['GGAL']).toEqual({ ars: 1234.56, usd: 0.9567 })
      expect(prices['YPF']).toEqual({ ars: 8900.00, usd: 6.8960 })
      expect(prices['oficial']).toBeUndefined()
    })
  })

  describe('getDollarRates', () => {
    it('returns current dollar rates', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      const rates = adapter.getDollarRates()
      expect(rates.oficial).toBe(1180.50)
      expect(rates.blue).toBe(1350.00)
      expect(rates.bolsa).toBe(1290.75)
      expect(rates.contadoconliqui).toBe(1310.25)
    })
  })

  describe('getHistoryPrices', () => {
    it('returns TickerHistoryMap for a given period', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      const hist = adapter.getHistoryPrices('1d')
      expect(hist['GGAL']).toEqual({ ars: 1200.00, usd: 0.9302 })
    })

    it('returns null ars/usd for symbols with no snapshot', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => MANYALL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_PARTIAL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
      await adapter.fetchAll()
      expect(adapter.getHistoryPrices('1d')['GGAL']).toEqual({ ars: null, usd: null })
    })
  })

  describe('getHistoryDollarRates', () => {
    it('returns dollar rates for a given period', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      const rates = adapter.getHistoryDollarRates('1d')
      expect(rates.oficial).toBe(1150.00)
      expect(rates.blue).toBe(1300.00)
    })

    it('returns null for dollar rates with no snapshot', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: async () => MANYALL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_PARTIAL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => HISTORY_FULL } as Response)
      await adapter.fetchAll()
      expect(adapter.getHistoryDollarRates('1d').blue).toBeNull()
    })
  })

  describe('getAllHistoryPrices', () => {
    it('returns maps for all four periods', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      const all = adapter.getAllHistoryPrices()
      expect(Object.keys(all)).toEqual(['1d', '1w', '1m', '3m'])
    })
  })

  describe('addTicker', () => {
    it('POSTs to /add with symbol body then calls fetchAll', async () => {
      mockFetchAll() // initial fetchAll
      await adapter.fetchAll()
      vi.mocked(fetch).mockClear()

      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 201 } as Response)
      mockFetchAll() // refetch after add

      await adapter.addTicker('PAMP')

      expect(vi.mocked(fetch).mock.calls[0]).toEqual([
        `${BASE_URL}/add`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ symbol: 'PAMP' }),
        }),
      ])
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(6) // 1 add + 5 fetchAll
    })

    it('throws on non-2xx response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 409 } as Response)
      await expect(adapter.addTicker('GGAL')).rejects.toThrow('409')
    })
  })

  describe('removeTicker', () => {
    it('POSTs to /remove with symbol body then calls fetchAll', async () => {
      mockFetchAll()
      await adapter.fetchAll()
      vi.mocked(fetch).mockClear()

      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      mockFetchAll()

      await adapter.removeTicker('YPF')

      expect(vi.mocked(fetch).mock.calls[0]).toEqual([
        `${BASE_URL}/remove`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ symbol: 'YPF' }),
        }),
      ])
    })

    it('throws on non-2xx response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as Response)
      await expect(adapter.removeTicker('FAKE')).rejects.toThrow('404')
    })
  })

  const NEWS_RESPONSE = [
    {
      title: 'YPF cierra acuerdo con Shell',
      url: 'https://example.com/ypf',
      source: 'Infobae',
      publishedAt: '2026-04-04T13:45:00Z',
      category: 'watchlist',
      summary: '### Resumen\nYPF cerró un acuerdo importante.',
    },
    {
      title: 'Fed mantiene tasas',
      url: 'https://example.com/fed',
      source: 'Reuters',
      publishedAt: '2026-04-04T11:20:00Z',
      category: 'global',
    },
    {
      title: 'Noticia más reciente',
      url: 'https://example.com/recent',
      source: 'Ambito',
      publishedAt: '2026-04-04T15:00:00Z',
      category: 'argentina',
    },
  ]

  describe('fetchNews / getNews', () => {
    it('returns empty array before fetchNews', () => {
      expect(adapter.getNews()).toEqual([])
    })

    it('fetches GET /news and stores sorted by publishedAt desc', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => NEWS_RESPONSE,
      } as Response)

      await adapter.fetchNews()

      expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/news`)
      const news = adapter.getNews()
      expect(news).toHaveLength(3)
      expect(news[0].publishedAt).toBe('2026-04-04T15:00:00Z')  // most recent first
      expect(news[1].publishedAt).toBe('2026-04-04T13:45:00Z')
      expect(news[2].publishedAt).toBe('2026-04-04T11:20:00Z')
      expect(news[1].summary).toBe('### Resumen\nYPF cerró un acuerdo importante.')
    })

    it('does not re-fetch if news already loaded', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => NEWS_RESPONSE,
      } as Response)

      await adapter.fetchNews()
      await adapter.fetchNews()  // second call — should NOT call fetch again

      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('throws and leaves cache empty on network error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      await expect(adapter.fetchNews()).rejects.toThrow('GET /news failed: 500')
      expect(adapter.getNews()).toEqual([])
    })
  })

  describe('getOneDayHistoryDaysAgo', () => {
    function makeDate(utcHour: number, utcMinute = 0): Date {
      const d = new Date(0)
      d.setUTCHours(utcHour, utcMinute, 0, 0)
      return d
    }

    it('returns 2 at 09:59 AM GMT-3 (12:59 UTC) — pre-market', () => {
      // 12:59 UTC = 09:59 GMT-3
      expect(getOneDayHistoryDaysAgo(makeDate(12, 59))).toBe(2)
    })

    it('returns 2 at 00:00 AM GMT-3 (03:00 UTC) — midnight, pre-market', () => {
      // 03:00 UTC = 00:00 GMT-3
      expect(getOneDayHistoryDaysAgo(makeDate(3, 0))).toBe(2)
    })

    it('returns 1 at exactly 10:00 AM GMT-3 (13:00 UTC) — market open boundary', () => {
      // 13:00 UTC = 10:00 GMT-3
      expect(getOneDayHistoryDaysAgo(makeDate(13, 0))).toBe(1)
    })

    it('returns 1 at 12:00 PM GMT-3 (15:00 UTC) — during trading hours', () => {
      expect(getOneDayHistoryDaysAgo(makeDate(15, 0))).toBe(1)
    })

    it('returns 1 at 18:00 PM GMT-3 (21:00 UTC) — after market close', () => {
      expect(getOneDayHistoryDaysAgo(makeDate(21, 0))).toBe(1)
    })
  })
})
