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

  // ─── Market data (stubs — implemented in Task 7) ─────────────────────────

  async getQuote(_symbol: string, _market: string): Promise<Quote> {
    throw new Error('Not implemented')
  }

  async getHistory(_symbol: string, _market: string, _from: Date, _to: Date): Promise<HistoryPoint[]> {
    throw new Error('Not implemented')
  }

  async searchSymbol(_query: string, _country?: string): Promise<SymbolResult[]> {
    throw new Error('Not implemented')
  }
}
