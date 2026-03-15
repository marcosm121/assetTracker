export interface Quote {
  symbol: string
  market: string
  price: number
  timestamp: Date
}

export interface HistoryPoint {
  date: Date
  close: number
}

export interface SymbolResult {
  symbol: string
  market: string
  label: string
}

export interface MarketDataProvider {
  login(username: string, password: string): Promise<void>
  refreshAuth(): Promise<void>
  isAuthenticated(): boolean
  getQuote(symbol: string, market: string): Promise<Quote>
  getHistory(symbol: string, market: string, from: Date, to: Date): Promise<HistoryPoint[]>
  searchSymbol(query: string, country?: string): Promise<SymbolResult[]>
}

export type VariationPeriod = '1d' | '1w' | '1m' | '3m' | '1y'

export interface WatchlistItem {
  symbol: string
  market: string
  label: string
}
