import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IoLAdapter } from './IoLAdapter'

const BASE_URL = 'https://api.invertironline.com'

describe('IoLAdapter auth', () => {
  let adapter: IoLAdapter

  beforeEach(() => {
    adapter = new IoLAdapter(BASE_URL)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('login stores api key and marks as authenticated', async () => {
    await adapter.login('my-api-key-123')
    expect(adapter.isAuthenticated()).toBe(true)
  })

  it('isAuthenticated returns false before login', () => {
    expect(adapter.isAuthenticated()).toBe(false)
  })
})

describe('IoLAdapter market data', () => {
  let adapter: IoLAdapter

  beforeEach(async () => {
    adapter = new IoLAdapter('https://api.invertironline.com')
    vi.stubGlobal('fetch', vi.fn())

    // Simulate logged-in state
    await adapter.login('test-api-key')
  })

  it('getQuote calls correct endpoint and maps response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ultimoPrecio: 1240.5,
        fechaHora: '2026-03-15T14:00:00',
      }),
    } as Response)

    const quote = await adapter.getQuote('GGAL', 'bCBA')
    expect(quote.price).toBe(1240.5)
    expect(quote.symbol).toBe('GGAL')
    expect(quote.market).toBe('bCBA')
  })

  it('getHistory maps seriehistorica response to HistoryPoint array', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { fecha: '2026-03-10T00:00:00', ultimo: 1200 },
        { fecha: '2026-03-11T00:00:00', ultimo: 1210 },
      ],
    } as Response)

    const history = await adapter.getHistory('GGAL', 'bCBA', new Date('2026-03-10'), new Date('2026-03-11'))
    expect(history).toHaveLength(2)
    expect(history[0].close).toBe(1200)
    expect(history[1].close).toBe(1210)
  })
})
