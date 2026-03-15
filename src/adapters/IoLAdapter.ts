import type {
  MarketDataProvider,
  Quote,
  HistoryPoint,
  SymbolResult,
} from './types'

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export class IoLAdapter implements MarketDataProvider {
  private accessToken: string | null = null
  private refreshTokenValue: string | null = null
  private expiresAt: number | null = null

  constructor(
    private readonly baseUrl: string = 'https://api.invertironline.com',
    private readonly onAuthChange?: (token: string, refresh: string, expiresIn: number) => void
  ) {}

  // ─── Auth ────────────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<void> {
    const tokens = await this.fetchTokens(
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    )
    this.applyTokens(tokens)
  }

  async refreshAuth(): Promise<void> {
    if (!this.refreshTokenValue) throw new Error('No refresh token available')
    const tokens = await this.fetchTokens(
      `grant_type=refresh_token&refresh_token=${encodeURIComponent(this.refreshTokenValue)}`
    )
    this.applyTokens(tokens)
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null
  }

  private async fetchTokens(body: string): Promise<TokenResponse> {
    const res = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
    return res.json()
  }

  private applyTokens(tokens: TokenResponse): void {
    this.accessToken = tokens.access_token
    this.refreshTokenValue = tokens.refresh_token
    this.expiresAt = Date.now() + tokens.expires_in * 1000
    this.onAuthChange?.(tokens.access_token, tokens.refresh_token, tokens.expires_in)
  }

  // ─── Authenticated request helper ────────────────────────────────────────

  private async authedFetch(path: string): Promise<Response> {
    if (!this.accessToken) throw new Error('Not authenticated')
    const needsRefresh = this.expiresAt !== null && Date.now() > this.expiresAt - 2 * 60 * 1000
    if (needsRefresh) await this.refreshAuth()

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
