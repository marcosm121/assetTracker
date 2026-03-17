import type {
  DataProvider,
  TickerPriceMap,
  TickerHistoryMap,
  TickerPrice,
  TickerPriceHistory,
  DollarRates,
  VariationPeriod,
} from './types'

const DOLLAR_KEYS = new Set(['oficial', 'blue', 'bolsa', 'contadoconliqui'])
const PERIODS: VariationPeriod[] = ['1d', '1w', '1m', '3m']
const DAYS_AGO: Record<VariationPeriod, number> = { '1d': 1, '1w': 7, '1m': 30, '3m': 90 }

function utcDateString(daysAgo: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

/**
 * Returns how many days ago to use as the `1d` history baseline.
 * Before 10:00 AM GMT-3 the market hasn't opened, so /manyall returns
 * yesterday's close — comparing to yesterday's historical snapshot would
 * give 0% variation. Use 2 days ago instead so the variation is meaningful.
 */
export function getOneDayHistoryDaysAgo(now: Date = new Date()): number {
  // GMT-3 local hour = UTC hour - 3, normalized to [0, 24)
  const localHour = ((now.getUTCHours() - 3) + 24) % 24
  return localHour < 10 ? 2 : 1
}

type RawManyAll = Record<string, { ars: number; usd: number } | number>
type RawHistory = Record<string, { ars: number | null; usd: number | null } | number | null>

function emptyDollarRates(): DollarRates {
  return { oficial: null, blue: null, bolsa: null, contadoconliqui: null }
}

export class InvestorDataAdapter implements DataProvider {
  private prices: TickerPriceMap = {}
  private dollarRates: DollarRates = emptyDollarRates()
  private history: Record<VariationPeriod, TickerHistoryMap> = { '1d': {}, '1w': {}, '1m': {}, '3m': {} }
  private historyDollar: Record<VariationPeriod, DollarRates> = {
    '1d': emptyDollarRates(),
    '1w': emptyDollarRates(),
    '1m': emptyDollarRates(),
    '3m': emptyDollarRates(),
  }
  private ready = false
  private readonly baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  async fetchAll(): Promise<void> {
    const [current, ...histRaws] = await Promise.all([
      this.get<RawManyAll>('/manyall'),
      ...PERIODS.map(p => this.get<RawHistory>(`/manyhistory/${utcDateString(DAYS_AGO[p])}`)),
    ])

    this.prices = this.parseTickerPrices(current)
    this.dollarRates = this.parseDollarRates(current)

    PERIODS.forEach((period, i) => {
      this.history[period] = this.parseTickerHistory(histRaws[i])
      this.historyDollar[period] = this.parseDollarRatesNullable(histRaws[i])
    })

    this.ready = true
  }

  getPrices(): TickerPriceMap { return this.prices }
  getHistoryPrices(period: VariationPeriod): TickerHistoryMap { return this.history[period] }
  getAllHistoryPrices(): Record<VariationPeriod, TickerHistoryMap> { return this.history }
  getWatchlist(): string[] { return Object.keys(this.prices) }
  getDollarRates(): DollarRates { return this.dollarRates }
  getHistoryDollarRates(period: VariationPeriod): DollarRates { return this.historyDollar[period] }
  isReady(): boolean { return this.ready }

  async addTicker(symbol: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    })
    if (!res.ok) throw new Error(`addTicker failed: ${res.status}`)
    await this.fetchAll().catch(() => {/* retain previous cache */})
  }

  async removeTicker(symbol: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    })
    if (!res.ok) throw new Error(`removeTicker failed: ${res.status}`)
    await this.fetchAll().catch(() => {/* retain previous cache */})
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`)
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return res.json() as Promise<T>
  }

  private parseTickerPrices(raw: RawManyAll): TickerPriceMap {
    const result: TickerPriceMap = {}
    for (const [key, value] of Object.entries(raw)) {
      if (!DOLLAR_KEYS.has(key) && typeof value === 'object' && value !== null) {
        result[key] = value as TickerPrice
      }
    }
    return result
  }

  private parseTickerHistory(raw: RawHistory): TickerHistoryMap {
    const result: TickerHistoryMap = {}
    for (const [key, value] of Object.entries(raw)) {
      if (DOLLAR_KEYS.has(key)) continue
      if (typeof value === 'object' && value !== null) {
        result[key] = value as TickerPriceHistory
      } else {
        result[key] = { ars: null, usd: null }
      }
    }
    return result
  }

  private parseDollarRates(raw: RawManyAll): DollarRates {
    return {
      oficial: typeof raw['oficial'] === 'number' ? raw['oficial'] : null,
      blue: typeof raw['blue'] === 'number' ? raw['blue'] : null,
      bolsa: typeof raw['bolsa'] === 'number' ? raw['bolsa'] : null,
      contadoconliqui: typeof raw['contadoconliqui'] === 'number' ? raw['contadoconliqui'] : null,
    }
  }

  private parseDollarRatesNullable(raw: RawHistory): DollarRates {
    return {
      oficial: typeof raw['oficial'] === 'number' ? raw['oficial'] : null,
      blue: typeof raw['blue'] === 'number' ? raw['blue'] : null,
      bolsa: typeof raw['bolsa'] === 'number' ? raw['bolsa'] : null,
      contadoconliqui: typeof raw['contadoconliqui'] === 'number' ? raw['contadoconliqui'] : null,
    }
  }
}
