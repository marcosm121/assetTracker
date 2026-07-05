export type VariationPeriod = '1d' | '1w' | '1m' | '3m'

export interface TickerPrice {
  ars: number
  usd: number
}

export interface TickerPriceHistory {
  ars: number | null
  usd: number | null
}

export type TickerPriceMap = Record<string, TickerPrice>
export type TickerHistoryMap = Record<string, TickerPriceHistory>

/** A single day of a ticker's historical price series (`GET /history/:symbol`). */
export interface PricePoint {
  date: string          // YYYY-MM-DD (UTC), consecutive days with no gaps
  ars: number | null    // null = no snapshot that day (render as a gap, not zero)
  usd: number | null
}

/** Windows offered by the asset detail chart, in days. */
export type ChartRange = 7 | 30 | 90

export interface DollarRates {
  oficial: number | null
  blue: number | null
  bolsa: number | null
  contadoconliqui: number | null
}

export type NewsCategory = 'global' | 'argentina' | 'geopolitics' | 'watchlist'

export interface NewsItem {
  title: string
  url: string
  source: string
  publishedAt: string   // ISO 8601
  category: NewsCategory
  summary?: string      // markdown, optional
}

export interface WatchlistItem {
  symbol: string
}

export interface DataProvider {
  fetchAll(): Promise<void>
  getPrices(): TickerPriceMap
  getHistoryPrices(period: VariationPeriod): TickerHistoryMap
  getAllHistoryPrices(): Record<VariationPeriod, TickerHistoryMap>
  getWatchlist(): string[]
  getDollarRates(): DollarRates
  getHistoryDollarRates(period: VariationPeriod): DollarRates
  fetchHistorySeries(symbol: string, days: ChartRange): Promise<PricePoint[]>
  addTicker(symbol: string): Promise<void>
  removeTicker(symbol: string): Promise<void>
  fetchNews(): Promise<void>
  getNews(): NewsItem[]
  isReady(): boolean
}
