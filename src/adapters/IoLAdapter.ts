import type {
  MarketDataProvider,
  Quote,
  HistoryPoint,
  SymbolResult,
} from './types'

export class IoLAdapter implements MarketDataProvider {
  private accessToken: string | null = null
  private readonly baseUrl: string
  private readonly onAuthChange?: (token: string, refresh: string, expiresIn: number) => void

  constructor(
    baseUrl: string = 'https://api.invertironline.com',
    onAuthChange?: (token: string, refresh: string, expiresIn: number) => void
  ) {
    this.baseUrl = baseUrl
    this.onAuthChange = onAuthChange
  }

  // ─── Auth ────────────────────────────────────────────────────────────────

  async login(apiKey: string): Promise<void> {
    this.accessToken = apiKey
    this.onAuthChange?.(apiKey, '', 0)
  }

  async refreshAuth(): Promise<void> {
    throw new Error('Not supported with API key auth')
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null
  }

  // ─── Authenticated request helper ────────────────────────────────────────

  private async authedFetch(path: string): Promise<Response> {
    if (!this.accessToken) throw new Error('Not authenticated')
    return fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
  }

  // ─── Market data (implemented in Task 7) ────────────────────────────────────

  async getQuote(symbol: string, market: string): Promise<Quote> {
    const res = await this.authedFetch(`/api/v2/${market}/Titulos/${symbol}/Cotizacion`)
    if (!res.ok) throw new Error(`getQuote failed: ${res.status}`)
    const data = await res.json()
    return {
      symbol,
      market,
      price: data.ultimoPrecio,
      timestamp: new Date(data.fechaHora),
    }
  }

  async getHistory(symbol: string, market: string, from: Date, to: Date): Promise<HistoryPoint[]> {
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const res = await this.authedFetch(
      `/api/v2/${market}/Titulos/${symbol}/Cotizacion/seriehistorica/${fmt(from)}/${fmt(to)}/false`
    )
    if (!res.ok) throw new Error(`getHistory failed: ${res.status}`)
    const data: Array<{ fecha: string; ultimo: number }> = await res.json()
    return data.map(d => ({ date: new Date(d.fecha), close: d.ultimo }))
  }

  async searchSymbol(query: string, country = 'argentina'): Promise<SymbolResult[]> {
    const res = await this.authedFetch(`/api/v2/Cotizaciones/Acciones/${country}/Todos`)
    if (!res.ok) throw new Error(`searchSymbol failed: ${res.status}`)
    const data: Array<{ simbolo: string; descripcion: string }> = await res.json()
    const q = query.toLowerCase()
    return data
      .filter(d => d.simbolo.toLowerCase().includes(q) || d.descripcion.toLowerCase().includes(q))
      .slice(0, 20)
      .map(d => ({ symbol: d.simbolo, market: 'bCBA', label: d.descripcion }))
  }
}
