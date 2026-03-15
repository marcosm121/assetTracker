# Assets Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React PWA that shows a user-configured watchlist of financial assets with historical price charts, backed by the InvertirOnLine API.

**Architecture:** Static frontend-only app. An `IoLAdapter` implements a `MarketDataProvider` interface — the only class aware of IoL specifics. All state lives in Zustand stores. All persistence is localStorage.

**Tech Stack:** React 18, Vite, TypeScript, TailwindCSS v3, Zustand, Lightweight Charts (TradingView), React Router v6, Vitest

---

## File Structure

```
src/
  adapters/
    types.ts              ← MarketDataProvider interface + domain types
    IoLAdapter.ts         ← IoL-specific implementation
  stores/
    authStore.ts
    watchlistStore.ts
    preferencesStore.ts
  screens/
    LoginScreen.tsx
    WatchlistScreen.tsx
    AssetDetailScreen.tsx
  components/
    VariationBadge.tsx
    PriceChart.tsx
    SymbolSearch.tsx
  utils/
    variation.ts
    storage.ts
  App.tsx
  main.tsx
docs/
  plans/
    2026-03-15-assets-tracker-design.md
    2026-03-15-assets-tracker-implementation.md (this file)
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd C:/Users/Marcos/Documents/Programacion/assetsTracker
npm create vite@latest . -- --template react-ts
npm install
```

**Step 2: Install dependencies**

```bash
npm install zustand react-router-dom lightweight-charts
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @vitejs/plugin-react
npx tailwindcss init -p
```

**Step 3: Configure TailwindCSS**

Edit `tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

Edit `src/index.css` (replace contents):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Configure Vitest in vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Install the jest-dom types:
```bash
npm install -D @testing-library/jest-dom
```

**Step 5: Smoke test — app starts**

```bash
npm run dev
```
Expected: Vite dev server running at `http://localhost:5173`

**Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold React + Vite + Tailwind + Vitest project"
```

---

## Task 2: Domain Types and MarketDataProvider Interface

**Files:**
- Create: `src/adapters/types.ts`
- Create: `src/adapters/types.test.ts`

**Step 1: Write the types**

Create `src/adapters/types.ts`:
```ts
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
```

**Step 2: Write a type-check test (compile-time contract)**

Create `src/adapters/types.test.ts`:
```ts
import { describe, it, expectTypeOf } from 'vitest'
import type { MarketDataProvider, Quote, HistoryPoint, SymbolResult } from './types'

describe('MarketDataProvider interface', () => {
  it('enforces correct return types', () => {
    // This test verifies the interface compiles correctly.
    // A mock implementation must satisfy all method signatures.
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
```

**Step 3: Run test**

```bash
npx vitest run src/adapters/types.test.ts
```
Expected: PASS

**Step 4: Commit**

```bash
git add src/adapters/types.ts src/adapters/types.test.ts
git commit -m "feat: add MarketDataProvider interface and domain types"
```

---

## Task 3: Variation Utility

**Files:**
- Create: `src/utils/variation.ts`
- Create: `src/utils/variation.test.ts`

**Step 1: Write failing tests**

Create `src/utils/variation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calcVariation } from './variation'

describe('calcVariation', () => {
  it('returns positive percentage when price increased', () => {
    expect(calcVariation(110, 100)).toBeCloseTo(10.0)
  })

  it('returns negative percentage when price decreased', () => {
    expect(calcVariation(90, 100)).toBeCloseTo(-10.0)
  })

  it('returns 0 when prices are equal', () => {
    expect(calcVariation(100, 100)).toBe(0)
  })

  it('returns null when reference price is 0 or missing', () => {
    expect(calcVariation(100, 0)).toBeNull()
    expect(calcVariation(100, undefined)).toBeNull()
  })
})
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/utils/variation.test.ts
```
Expected: FAIL — `calcVariation` not found

**Step 3: Implement**

Create `src/utils/variation.ts`:
```ts
export function calcVariation(current: number, reference: number | undefined): number | null {
  if (!reference) return null
  return ((current - reference) / reference) * 100
}
```

**Step 4: Run tests**

```bash
npx vitest run src/utils/variation.test.ts
```
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/utils/variation.ts src/utils/variation.test.ts
git commit -m "feat: add variation percentage utility"
```

---

## Task 4: localStorage Storage Utilities

**Files:**
- Create: `src/utils/storage.ts`
- Create: `src/utils/storage.test.ts`

**Step 1: Write failing tests**

Create `src/utils/storage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveAuth, loadAuth, clearAuth, saveWatchlist, loadWatchlist, savePreferences, loadPreferences } from './storage'
import type { WatchlistItem, VariationPeriod } from '../adapters/types'

beforeEach(() => localStorage.clear())

describe('auth storage', () => {
  it('saves and loads auth', () => {
    const auth = { access_token: 'tok', refresh_token: 'ref', expires_at: 9999999 }
    saveAuth(auth)
    expect(loadAuth()).toEqual(auth)
  })

  it('clears auth', () => {
    saveAuth({ access_token: 'tok', refresh_token: 'ref', expires_at: 9999999 })
    clearAuth()
    expect(loadAuth()).toBeNull()
  })
})

describe('watchlist storage', () => {
  it('saves and loads watchlist', () => {
    const items: WatchlistItem[] = [{ symbol: 'GGAL', market: 'bCBA', label: 'Galicia' }]
    saveWatchlist(items)
    expect(loadWatchlist()).toEqual(items)
  })

  it('returns empty array when nothing saved', () => {
    expect(loadWatchlist()).toEqual([])
  })
})

describe('preferences storage', () => {
  it('saves and loads variation period preference', () => {
    savePreferences({ variationPeriod: '1m' })
    expect(loadPreferences().variationPeriod).toBe('1m')
  })

  it('defaults to 1d when nothing saved', () => {
    expect(loadPreferences().variationPeriod).toBe('1d')
  })
})
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/utils/storage.test.ts
```
Expected: FAIL

**Step 3: Implement**

Create `src/utils/storage.ts`:
```ts
import type { WatchlistItem, VariationPeriod } from '../adapters/types'

interface AuthData {
  access_token: string
  refresh_token: string
  expires_at: number
}

interface Preferences {
  variationPeriod: VariationPeriod
}

const KEYS = {
  AUTH: 'assets_tracker_auth',
  WATCHLIST: 'assets_tracker_watchlist',
  PREFERENCES: 'assets_tracker_preferences',
}

export function saveAuth(auth: AuthData): void {
  localStorage.setItem(KEYS.AUTH, JSON.stringify(auth))
}

export function loadAuth(): AuthData | null {
  const raw = localStorage.getItem(KEYS.AUTH)
  return raw ? JSON.parse(raw) : null
}

export function clearAuth(): void {
  localStorage.removeItem(KEYS.AUTH)
}

export function saveWatchlist(items: WatchlistItem[]): void {
  localStorage.setItem(KEYS.WATCHLIST, JSON.stringify(items))
}

export function loadWatchlist(): WatchlistItem[] {
  const raw = localStorage.getItem(KEYS.WATCHLIST)
  return raw ? JSON.parse(raw) : []
}

export function savePreferences(prefs: Partial<Preferences>): void {
  const current = loadPreferences()
  localStorage.setItem(KEYS.PREFERENCES, JSON.stringify({ ...current, ...prefs }))
}

export function loadPreferences(): Preferences {
  const raw = localStorage.getItem(KEYS.PREFERENCES)
  return raw ? JSON.parse(raw) : { variationPeriod: '1d' }
}
```

**Step 4: Run tests**

```bash
npx vitest run src/utils/storage.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/storage.ts src/utils/storage.test.ts
git commit -m "feat: add localStorage storage utilities"
```

---

## Task 5: Zustand Stores

**Files:**
- Create: `src/stores/authStore.ts`
- Create: `src/stores/watchlistStore.ts`
- Create: `src/stores/preferencesStore.ts`

**Step 1: Auth store**

Create `src/stores/authStore.ts`:
```ts
import { create } from 'zustand'
import { loadAuth, saveAuth, clearAuth } from '../utils/storage'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  isAuthenticated: () => boolean
  setAuth: (accessToken: string, refreshToken: string, expiresIn: number) => void
  clearAuth: () => void
  needsRefresh: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => {
  const persisted = loadAuth()
  return {
    accessToken: persisted?.access_token ?? null,
    refreshToken: persisted?.refresh_token ?? null,
    expiresAt: persisted?.expires_at ?? null,

    isAuthenticated: () => get().accessToken !== null,

    needsRefresh: () => {
      const { expiresAt } = get()
      if (!expiresAt) return false
      return Date.now() > expiresAt - 2 * 60 * 1000 // 2 min buffer
    },

    setAuth: (accessToken, refreshToken, expiresIn) => {
      const expiresAt = Date.now() + expiresIn * 1000
      saveAuth({ access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt })
      set({ accessToken, refreshToken, expiresAt })
    },

    clearAuth: () => {
      clearAuth()
      set({ accessToken: null, refreshToken: null, expiresAt: null })
    },
  }
})
```

**Step 2: Watchlist store**

Create `src/stores/watchlistStore.ts`:
```ts
import { create } from 'zustand'
import { loadWatchlist, saveWatchlist } from '../utils/storage'
import type { WatchlistItem } from '../adapters/types'

interface WatchlistState {
  items: WatchlistItem[]
  addItem: (item: WatchlistItem) => void
  removeItem: (symbol: string, market: string) => void
  hasItem: (symbol: string, market: string) => boolean
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: loadWatchlist(),

  addItem: (item) => {
    const items = [...get().items, item]
    saveWatchlist(items)
    set({ items })
  },

  removeItem: (symbol, market) => {
    const items = get().items.filter(i => !(i.symbol === symbol && i.market === market))
    saveWatchlist(items)
    set({ items })
  },

  hasItem: (symbol, market) =>
    get().items.some(i => i.symbol === symbol && i.market === market),
}))
```

**Step 3: Preferences store**

Create `src/stores/preferencesStore.ts`:
```ts
import { create } from 'zustand'
import { loadPreferences, savePreferences } from '../utils/storage'
import type { VariationPeriod } from '../adapters/types'

interface PreferencesState {
  variationPeriod: VariationPeriod
  setVariationPeriod: (period: VariationPeriod) => void
}

export const usePreferencesStore = create<PreferencesState>(() => ({
  variationPeriod: loadPreferences().variationPeriod,

  setVariationPeriod: (period) => {
    savePreferences({ variationPeriod: period })
    // Direct state mutation via set not exposed, use setter pattern:
  },
}))

// Patch the setter to also update state
usePreferencesStore.setState((state) => ({
  setVariationPeriod: (period: VariationPeriod) => {
    savePreferences({ variationPeriod: period })
    usePreferencesStore.setState({ variationPeriod: period })
  },
}))
```

**Step 4: Commit**

```bash
git add src/stores/
git commit -m "feat: add Zustand stores for auth, watchlist, and preferences"
```

---

## Task 6: IoLAdapter — Authentication

**Files:**
- Create: `src/adapters/IoLAdapter.ts`
- Create: `src/adapters/IoLAdapter.test.ts`

**Step 1: Write failing tests for auth**

Create `src/adapters/IoLAdapter.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IoLAdapter } from './IoLAdapter'

const BASE_URL = 'https://api.invertironline.com'

describe('IoLAdapter auth', () => {
  let adapter: IoLAdapter

  beforeEach(() => {
    adapter = new IoLAdapter(BASE_URL)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('login calls token endpoint with credentials', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'tok123',
        refresh_token: 'ref456',
        expires_in: 900,
      }),
    } as Response)

    await adapter.login('user@test.com', 'pass123')

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/token`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('grant_type=password'),
      })
    )
    expect(adapter.isAuthenticated()).toBe(true)
  })

  it('login throws on bad credentials', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response)

    await expect(adapter.login('bad', 'creds')).rejects.toThrow()
  })

  it('isAuthenticated returns false before login', () => {
    expect(adapter.isAuthenticated()).toBe(false)
  })
})
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/adapters/IoLAdapter.test.ts
```
Expected: FAIL — `IoLAdapter` not found

**Step 3: Implement auth in IoLAdapter**

Create `src/adapters/IoLAdapter.ts`:
```ts
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

  constructor(private readonly baseUrl: string = 'https://api.invertironline.com') {}

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
```

**Step 4: Run tests**

```bash
npx vitest run src/adapters/IoLAdapter.test.ts
```
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/adapters/IoLAdapter.ts src/adapters/IoLAdapter.test.ts
git commit -m "feat: add IoLAdapter with authentication (login + refresh)"
```

---

## Task 7: IoLAdapter — Market Data

**Files:**
- Modify: `src/adapters/IoLAdapter.ts`
- Modify: `src/adapters/IoLAdapter.test.ts`

**Step 1: Add failing tests for market data**

Append to `src/adapters/IoLAdapter.test.ts`:
```ts
describe('IoLAdapter market data', () => {
  let adapter: IoLAdapter

  beforeEach(async () => {
    adapter = new IoLAdapter('https://api.invertironline.com')
    vi.stubGlobal('fetch', vi.fn())

    // Simulate logged-in state
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok', refresh_token: 'ref', expires_in: 900 }),
    } as Response)
    await adapter.login('u', 'p')
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
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/adapters/IoLAdapter.test.ts
```
Expected: FAIL on getQuote and getHistory tests

**Step 3: Implement market data methods**

Replace the stub methods in `src/adapters/IoLAdapter.ts`:

```ts
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
  // IoL doesn't have a text search — fetch all instruments and filter client-side
  const res = await this.authedFetch(`/api/v2/Cotizaciones/Acciones/${country}/Todos`)
  if (!res.ok) throw new Error(`searchSymbol failed: ${res.status}`)
  const data: Array<{ simbolo: string; descripcion: string }> = await res.json()
  const q = query.toLowerCase()
  return data
    .filter(d => d.simbolo.toLowerCase().includes(q) || d.descripcion.toLowerCase().includes(q))
    .slice(0, 20)
    .map(d => ({ symbol: d.simbolo, market: 'bCBA', label: d.descripcion }))
}
```

**Step 4: Run all adapter tests**

```bash
npx vitest run src/adapters/IoLAdapter.test.ts
```
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/adapters/IoLAdapter.ts src/adapters/IoLAdapter.test.ts
git commit -m "feat: implement getQuote, getHistory, searchSymbol in IoLAdapter"
```

---

## Task 8: App Router and AdapterContext

**Files:**
- Create: `src/AdapterContext.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Create AdapterContext**

Create `src/AdapterContext.tsx`:
```tsx
import React, { createContext, useContext, useRef } from 'react'
import { IoLAdapter } from './adapters/IoLAdapter'
import type { MarketDataProvider } from './adapters/types'

const AdapterContext = createContext<MarketDataProvider | null>(null)

export function AdapterProvider({ children }: { children: React.ReactNode }) {
  const adapterRef = useRef<MarketDataProvider>(new IoLAdapter())
  return (
    <AdapterContext.Provider value={adapterRef.current}>
      {children}
    </AdapterContext.Provider>
  )
}

export function useAdapter(): MarketDataProvider {
  const ctx = useContext(AdapterContext)
  if (!ctx) throw new Error('useAdapter must be used within AdapterProvider')
  return ctx
}
```

**Step 2: Set up routing in App.tsx**

Replace `src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginScreen from './screens/LoginScreen'
import WatchlistScreen from './screens/WatchlistScreen'
import AssetDetailScreen from './screens/AssetDetailScreen'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<RequireAuth><WatchlistScreen /></RequireAuth>} />
        <Route path="/asset/:market/:symbol" element={<RequireAuth><AssetDetailScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

**Step 3: Wrap with AdapterProvider in main.tsx**

Replace `src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { AdapterProvider } from './AdapterContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AdapterProvider>
      <App />
    </AdapterProvider>
  </React.StrictMode>
)
```

**Step 4: Create placeholder screens so app compiles**

Create `src/screens/LoginScreen.tsx`:
```tsx
export default function LoginScreen() {
  return <div className="p-4">Login</div>
}
```

Create `src/screens/WatchlistScreen.tsx`:
```tsx
export default function WatchlistScreen() {
  return <div className="p-4">Watchlist</div>
}
```

Create `src/screens/AssetDetailScreen.tsx`:
```tsx
export default function AssetDetailScreen() {
  return <div className="p-4">Asset Detail</div>
}
```

**Step 5: Verify app compiles and routes work**

```bash
npm run dev
```
Expected: App loads, `/login` renders Login, `/` redirects to `/login` when unauthenticated.

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: add router, AdapterContext, and screen placeholders"
```

---

## Task 9: Login Screen

**Files:**
- Modify: `src/screens/LoginScreen.tsx`

**Step 1: Implement Login screen**

Replace `src/screens/LoginScreen.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useAuthStore } from '../stores/authStore'

export default function LoginScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const adapter = useAdapter()
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await adapter.login(username, password)
      // Sync token into Zustand store from adapter internals
      // The adapter owns the token; we read it via a getter we'll add:
      navigate('/')
    } catch {
      setError('Credenciales incorrectas. Verificá tu usuario y contraseña de IoL.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">Assets Tracker</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Usuario IoL</label>
            <input
              type="email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-3 font-medium transition-colors"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        <p className="text-gray-600 text-xs text-center mt-6">
          Tus credenciales se guardan localmente en este dispositivo.
        </p>
      </div>
    </div>
  )
}
```

**Note:** The adapter needs to expose auth state so Zustand can sync on login. In Task 6 the `IoLAdapter` stores tokens internally. To keep coupling low, modify `IoLAdapter` to accept an optional `onAuthChange` callback:

Add to `IoLAdapter` constructor and `applyTokens`:
```ts
constructor(
  private readonly baseUrl: string = 'https://api.invertironline.com',
  private readonly onAuthChange?: (token: string, refresh: string, expiresIn: number) => void
) {}

private applyTokens(tokens: TokenResponse): void {
  this.accessToken = tokens.access_token
  this.refreshTokenValue = tokens.refresh_token
  this.expiresAt = Date.now() + tokens.expires_in * 1000
  this.onAuthChange?.(tokens.access_token, tokens.refresh_token, tokens.expires_in)
}
```

Update `AdapterContext.tsx` to wire the callback:
```tsx
const setAuth = useAuthStore.getState().setAuth
const adapterRef = useRef<MarketDataProvider>(
  new IoLAdapter(undefined, (token, refresh, expiresIn) => setAuth(token, refresh, expiresIn))
)
```

**Step 2: Verify login flow manually**

```bash
npm run dev
```
Navigate to `http://localhost:5173/login`. Enter IoL credentials. Verify redirect to `/` on success.

**Step 3: Commit**

```bash
git add src/screens/LoginScreen.tsx src/adapters/IoLAdapter.ts src/AdapterContext.tsx
git commit -m "feat: implement Login screen with IoL auth"
```

---

## Task 10: VariationBadge Component

**Files:**
- Create: `src/components/VariationBadge.tsx`

**Step 1: Implement**

Create `src/components/VariationBadge.tsx`:
```tsx
interface Props {
  value: number | null
}

export default function VariationBadge({ value }: Props) {
  if (value === null) return <span className="text-gray-500 text-sm">—</span>

  const positive = value >= 0
  const color = positive ? 'text-green-400' : 'text-red-400'
  const arrow = positive ? '▲' : '▼'
  const display = `${positive ? '+' : ''}${value.toFixed(2)}%`

  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {display}
    </span>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/VariationBadge.tsx
git commit -m "feat: add VariationBadge component"
```

---

## Task 11: Watchlist Screen

**Files:**
- Modify: `src/screens/WatchlistScreen.tsx`

**Step 1: Implement Watchlist screen**

Replace `src/screens/WatchlistScreen.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWatchlistStore } from '../stores/watchlistStore'
import { usePreferencesStore } from '../stores/preferencesStore'
import { useAdapter } from '../AdapterContext'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod, WatchlistItem } from '../adapters/types'
import { subDays, subWeeks, subMonths, subYears } from '../utils/dates'

interface AssetRow extends WatchlistItem {
  price: number | null
  variation: number | null
  loading: boolean
}

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': 'vs día ant.',
  '1w': 'vs LW',
  '1m': 'vs LM',
  '3m': 'vs L3M',
  '1y': 'vs LY',
}

export default function WatchlistScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const items = useWatchlistStore(s => s.items)
  const { variationPeriod, setVariationPeriod } = usePreferencesStore()
  const [rows, setRows] = useState<AssetRow[]>([])

  const loadAsset = useCallback(async (item: WatchlistItem): Promise<AssetRow> => {
    try {
      const now = new Date()
      const from = periodToFrom(variationPeriod, now)
      const [quote, history] = await Promise.all([
        adapter.getQuote(item.symbol, item.market),
        adapter.getHistory(item.symbol, item.market, from, now),
      ])
      const refPrice = history[0]?.close ?? null
      return {
        ...item,
        price: quote.price,
        variation: calcVariation(quote.price, refPrice ?? undefined),
        loading: false,
      }
    } catch {
      return { ...item, price: null, variation: null, loading: false }
    }
  }, [adapter, variationPeriod])

  useEffect(() => {
    if (items.length === 0) return
    setRows(items.map(i => ({ ...i, price: null, variation: null, loading: true })))
    items.forEach(async (item) => {
      const row = await loadAsset(item)
      setRows(prev => prev.map(r => r.symbol === item.symbol && r.market === item.market ? row : r))
    })
  }, [items, variationPeriod, loadAsset])

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Mi Watchlist</h1>
        <select
          value={variationPeriod}
          onChange={e => setVariationPeriod(e.target.value as VariationPeriod)}
          className="bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {(Object.entries(PERIOD_LABELS) as [VariationPeriod, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-800">
        {rows.length === 0 && (
          <p className="text-gray-500 text-center py-16 text-sm">
            Tu watchlist está vacía.<br />Tocá + para agregar activos.
          </p>
        )}
        {rows.map(row => (
          <button
            key={`${row.market}-${row.symbol}`}
            onClick={() => navigate(`/asset/${row.market}/${row.symbol}`)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-900 transition-colors text-left"
          >
            <div>
              <p className="font-medium">{row.symbol}</p>
              <p className="text-sm text-gray-400">{row.label}</p>
            </div>
            <div className="text-right">
              {row.loading ? (
                <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
              ) : (
                <>
                  <p className="font-medium">{row.price !== null ? `$${row.price.toLocaleString('es-AR')}` : '—'}</p>
                  <VariationBadge value={row.variation} />
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={() => navigate('/search')}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 text-2xl flex items-center justify-center shadow-lg transition-colors"
      >
        +
      </button>
    </div>
  )
}

function periodToFrom(period: VariationPeriod, now: Date): Date {
  switch (period) {
    case '1d': return subDays(now, 1)
    case '1w': return subDays(now, 7)
    case '1m': return subMonths(now, 1)
    case '3m': return subMonths(now, 3)
    case '1y': return subYears(now, 1)
  }
}
```

**Step 2: Add date helpers (avoid date-fns dependency)**

Create `src/utils/dates.ts`:
```ts
export function subDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

export function subMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - n)
  return d
}

export function subYears(date: Date, n: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() - n)
  return d
}
```

**Step 3: Add route `/search` placeholder in App.tsx**

In `src/App.tsx`, add:
```tsx
import SymbolSearchScreen from './screens/SymbolSearchScreen'
// ...
<Route path="/search" element={<RequireAuth><SymbolSearchScreen /></RequireAuth>} />
```

Create placeholder `src/screens/SymbolSearchScreen.tsx`:
```tsx
export default function SymbolSearchScreen() {
  return <div className="p-4 text-white">Search</div>
}
```

**Step 4: Run dev and verify watchlist renders**

```bash
npm run dev
```

**Step 5: Commit**

```bash
git add src/screens/WatchlistScreen.tsx src/screens/SymbolSearchScreen.tsx src/utils/dates.ts src/App.tsx
git commit -m "feat: implement Watchlist screen with variation selector"
```

---

## Task 12: Symbol Search Screen

**Files:**
- Modify: `src/screens/SymbolSearchScreen.tsx`

**Step 1: Implement**

Replace `src/screens/SymbolSearchScreen.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'
import type { SymbolResult } from '../adapters/types'

export default function SymbolSearchScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { addItem, removeItem, hasItem } = useWatchlistStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    setError(null)
    try {
      const res = await adapter.searchSymbol(q)
      setResults(res)
    } catch {
      setError('No se pudo buscar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function toggleItem(item: SymbolResult) {
    if (hasItem(item.symbol, item.market)) {
      removeItem(item.symbol, item.market)
    } else {
      addItem(item)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          ←
        </button>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por símbolo o nombre..."
          className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="divide-y divide-gray-800">
        {loading && <p className="text-gray-500 text-center py-8 text-sm">Buscando...</p>}
        {error && <p className="text-red-400 text-center py-8 text-sm">{error}</p>}
        {results.map(item => {
          const inList = hasItem(item.symbol, item.market)
          return (
            <button
              key={`${item.market}-${item.symbol}`}
              onClick={() => toggleItem(item)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-900 transition-colors text-left"
            >
              <div>
                <p className="font-medium">{item.symbol}</p>
                <p className="text-sm text-gray-400">{item.label}</p>
              </div>
              <span className={`text-sm font-medium ${inList ? 'text-red-400' : 'text-blue-400'}`}>
                {inList ? 'Quitar' : '+ Agregar'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/screens/SymbolSearchScreen.tsx
git commit -m "feat: implement Symbol Search screen"
```

---

## Task 13: Asset Detail Screen with Chart

**Files:**
- Modify: `src/screens/AssetDetailScreen.tsx`
- Create: `src/components/PriceChart.tsx`

**Step 1: Implement PriceChart component**

Create `src/components/PriceChart.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle } from 'lightweight-charts'
import type { HistoryPoint } from '../adapters/types'

interface Props {
  data: HistoryPoint[]
}

export default function PriceChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#030712' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: containerRef.current.clientWidth,
      height: 300,
      timeScale: { borderColor: '#374151' },
      rightPriceScale: { borderColor: '#374151' },
    })

    const series = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
    })

    series.setData(
      data.map(p => ({
        time: p.date.toISOString().split('T')[0] as `${number}-${number}-${number}`,
        value: p.close,
      }))
    )

    chart.timeScale().fitContent()

    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current!.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data])

  return <div ref={containerRef} className="w-full" />
}
```

**Step 2: Implement Asset Detail screen**

Replace `src/screens/AssetDetailScreen.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import PriceChart from '../components/PriceChart'
import type { HistoryPoint } from '../adapters/types'
import { subDays, subMonths, subYears } from '../utils/dates'

type Period = '1S' | '1M' | '3M' | '1A'

const PERIODS: Period[] = ['1S', '1M', '3M', '1A']

function periodToFrom(period: Period, now: Date): Date {
  switch (period) {
    case '1S': return subDays(now, 7)
    case '1M': return subMonths(now, 1)
    case '3M': return subMonths(now, 3)
    case '1A': return subYears(now, 1)
  }
}

export default function AssetDetailScreen() {
  const { market, symbol } = useParams<{ market: string; symbol: string }>()
  const navigate = useNavigate()
  const adapter = useAdapter()
  const [period, setPeriod] = useState<Period>('1M')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!market || !symbol) return
    setLoading(true)
    setError(null)

    const now = new Date()
    const from = periodToFrom(period, now)

    Promise.all([
      adapter.getQuote(symbol, market),
      adapter.getHistory(symbol, market, from, now),
    ])
      .then(([quote, hist]) => {
        setPrice(quote.price)
        setHistory(hist)
      })
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setLoading(false))
  }, [market, symbol, period, adapter])

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">←</button>
        <div>
          <h1 className="font-semibold">{symbol}</h1>
          <p className="text-xs text-gray-500">{market}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Price */}
        <div>
          {loading ? (
            <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold">
              {price !== null ? `$${price.toLocaleString('es-AR')}` : '—'}
            </p>
          )}
        </div>

        {/* Period tabs */}
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chart */}
        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : loading ? (
          <div className="h-[300px] bg-gray-800 rounded animate-pulse" />
        ) : (
          <PriceChart data={history} />
        )}
      </div>
    </div>
  )
}
```

**Step 3: Verify full flow**

```bash
npm run dev
```
Walk through: Login → Watchlist (empty) → Search → Add GGAL → Back to Watchlist → Tap GGAL → See chart with period tabs.

**Step 4: Commit**

```bash
git add src/screens/AssetDetailScreen.tsx src/components/PriceChart.tsx
git commit -m "feat: implement Asset Detail screen with Lightweight Charts"
```

---

## Task 14: PWA Configuration

**Files:**
- Modify: `index.html`
- Create: `public/manifest.json`
- Modify: `vite.config.ts`

**Step 1: Install vite-plugin-pwa**

```bash
npm install -D vite-plugin-pwa
```

**Step 2: Configure PWA in vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Assets Tracker',
        short_name: 'Assets',
        description: 'Seguimiento de activos financieros',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

**Step 3: Add meta tags to index.html**

```html
<meta name="theme-color" content="#030712">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icon-192.png">
```

**Step 4: Add placeholder icons**

Place two PNG icons at `public/icon-192.png` and `public/icon-512.png`. Any image works for now.

**Step 5: Build and verify**

```bash
npm run build
npm run preview
```
Expected: App builds cleanly. On Chrome mobile: "Add to Home Screen" option available.

**Step 6: Commit**

```bash
git add vite.config.ts index.html public/
git commit -m "feat: configure PWA with manifest and service worker"
```

---

## Task 15: Deploy to Netlify/Vercel

**Step 1: Build**

```bash
npm run build
```
Expected: `dist/` folder created with no errors.

**Step 2: Deploy (choose one)**

**Option A — Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Option B — Vercel:**
```bash
npm install -g vercel
vercel --prod
```

Both are free. The app will get an HTTPS URL shareable with others.

**Step 3: Test CORS**

Open the deployed URL on mobile. Try to log in. If you see a CORS error in the browser console, proceed to Appendix A.

**Step 4: Commit**

```bash
git add .
git commit -m "chore: add deployment config"
```

---

## Appendix A: CORS Fallback (Cloudflare Worker)

Only needed if IoL's API returns CORS errors when called from a browser.

**Step 1: Create Cloudflare Worker**

In Cloudflare Dashboard → Workers → Create Worker. Replace default code with:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url)
    const target = 'https://api.invertironline.com' + url.pathname + url.search

    const upstreamRequest = new Request(target, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' ? request.body : undefined,
    })

    const response = await fetch(upstreamRequest)
    const newHeaders = new Headers(response.headers)
    newHeaders.set('Access-Control-Allow-Origin', '*')
    newHeaders.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    })
  }
}
```

Deploy. You'll get a URL like `https://iol-proxy.your-subdomain.workers.dev`.

**Step 2: Point IoLAdapter at the proxy**

In `AdapterContext.tsx`:
```tsx
new IoLAdapter('https://iol-proxy.your-subdomain.workers.dev', ...)
```

Or better, make it an env variable:
```tsx
new IoLAdapter(import.meta.env.VITE_IOL_BASE_URL ?? 'https://api.invertironline.com', ...)
```

Set `VITE_IOL_BASE_URL` in your Netlify/Vercel environment variables.

---

## Run All Tests

```bash
npx vitest run
```
Expected: All tests pass.
