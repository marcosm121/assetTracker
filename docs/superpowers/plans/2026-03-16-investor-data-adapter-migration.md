# InvestorData Adapter Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the IoL API integration with the `investorData` backend, showing ARS + USD prices for each asset with multi-period variation, and a dollar rates footer.

**Architecture:** A new `InvestorDataAdapter` implements a redesigned `DataProvider` interface. On `fetchAll()` it fires 5 parallel requests (`/manyall` + 4 × `/manyhistory/:date`) and caches all results in memory. Screens read synchronously from cache. No authentication. The watchlist is owned by the backend — `POST /add` and `POST /remove` manage it server-side, the frontend mirrors it after each `fetchAll()`.

**Tech Stack:** React 18, Vite, TypeScript, TailwindCSS v3, Zustand, React Router v6, Vitest

**Working directory:** `/Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation`

**Spec:** `docs/superpowers/specs/2026-03-15-investor-data-adapter-design.md`

---

## File Structure

### Files to create
- `src/adapters/InvestorDataAdapter.ts` — new adapter implementing `DataProvider`
- `src/adapters/InvestorDataAdapter.test.ts` — unit tests (TDD)
- `src/config.ts` — `INVESTOR_DATA_URL` env var
- `src/components/DollarFooter.tsx` — dollar rates footer component
- `src/screens/AddTickerScreen.tsx` — add/remove tickers UI

### Files to modify
- `src/adapters/types.ts` — new `DataProvider` interface + domain types
- `src/adapters/types.test.ts` — updated type-check test
- `src/utils/storage.ts` — remove auth functions, watchlist becomes `string[]`
- `src/utils/storage.test.ts` — updated tests
- `src/stores/watchlistStore.ts` — simplified: items are `string[]`, `setItems` replaces add/remove
- `src/stores/preferencesStore.ts` — `VariationPeriod` removes `'1y'`
- `src/AdapterContext.tsx` — use `InvestorDataAdapter`, no auth callback
- `src/App.tsx` — remove `RequireAuth` guard, update routes
- `src/screens/WatchlistScreen.tsx` — full rewrite: new data model + loading states + dollar footer
- `src/screens/AssetDetailScreen.tsx` — simplified: no chart, all periods shown simultaneously

### Files to delete (Task 11)
- `src/adapters/IoLAdapter.ts`
- `src/adapters/IoLAdapter.test.ts`
- `src/stores/authStore.ts`
- `src/screens/LoginScreen.tsx`
- `src/screens/SymbolSearchScreen.tsx`
- `src/components/PriceChart.tsx`

---

## Chunk 1: Foundation — Types, Storage, Adapter

---

### Task 1: Update Domain Types

**Files:**
- Modify: `src/adapters/types.ts`
- Modify: `src/adapters/types.test.ts`

- [ ] **Step 1: Replace `src/adapters/types.ts` entirely**

```ts
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

export interface DollarRates {
  oficial: number | null
  blue: number | null
  bolsa: number | null
  contadoconliqui: number | null
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
  addTicker(symbol: string): Promise<void>
  removeTicker(symbol: string): Promise<void>
  isReady(): boolean
}
```

- [ ] **Step 2: Replace `src/adapters/types.test.ts` entirely**

```ts
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
    }
    expectTypeOf(mock).toMatchTypeOf<DataProvider>()
  })
})
```

- [ ] **Step 3: Run test**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx vitest run src/adapters/types.test.ts 2>&1
```
Expected: 1 test PASS

- [ ] **Step 4: Commit**

```bash
git add src/adapters/types.ts src/adapters/types.test.ts
git commit -m "feat: replace MarketDataProvider with DataProvider interface and new domain types"
```

---

### Task 2: Update Storage Utilities

**Files:**
- Modify: `src/utils/storage.ts`
- Modify: `src/utils/storage.test.ts`

- [ ] **Step 1: Replace `src/utils/storage.ts` entirely**

Remove auth functions. Change watchlist storage to `string[]`.

```ts
import type { VariationPeriod } from '../adapters/types'

interface Preferences {
  variationPeriod: VariationPeriod
}

const KEYS = {
  WATCHLIST: 'assets_tracker_watchlist',
  PREFERENCES: 'assets_tracker_preferences',
}

export function saveWatchlist(items: string[]): void {
  localStorage.setItem(KEYS.WATCHLIST, JSON.stringify(items))
}

export function loadWatchlist(): string[] {
  const raw = localStorage.getItem(KEYS.WATCHLIST)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function savePreferences(prefs: Partial<Preferences>): void {
  const current = loadPreferences()
  localStorage.setItem(KEYS.PREFERENCES, JSON.stringify({ ...current, ...prefs }))
}

export function loadPreferences(): Preferences {
  const raw = localStorage.getItem(KEYS.PREFERENCES)
  if (!raw) return { variationPeriod: '1d' }
  try {
    return JSON.parse(raw)
  } catch {
    return { variationPeriod: '1d' }
  }
}
```

- [ ] **Step 2: Replace `src/utils/storage.test.ts` entirely**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveWatchlist, loadWatchlist, savePreferences, loadPreferences } from './storage'

beforeEach(() => localStorage.clear())

describe('watchlist storage', () => {
  it('saves and loads a string array', () => {
    saveWatchlist(['GGAL', 'YPF'])
    expect(loadWatchlist()).toEqual(['GGAL', 'YPF'])
  })

  it('returns empty array when nothing saved', () => {
    expect(loadWatchlist()).toEqual([])
  })

  it('returns empty array on corrupted data', () => {
    localStorage.setItem('assets_tracker_watchlist', 'not-json')
    expect(loadWatchlist()).toEqual([])
  })
})

describe('preferences storage', () => {
  it('saves and loads variation period', () => {
    savePreferences({ variationPeriod: '1m' })
    expect(loadPreferences().variationPeriod).toBe('1m')
  })

  it('defaults to 1d when nothing saved', () => {
    expect(loadPreferences().variationPeriod).toBe('1d')
  })

  it('returns default on corrupted data', () => {
    localStorage.setItem('assets_tracker_preferences', 'not-json')
    expect(loadPreferences().variationPeriod).toBe('1d')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx vitest run src/utils/storage.test.ts 2>&1
```
Expected: 6 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/storage.ts src/utils/storage.test.ts
git commit -m "feat: simplify storage — remove auth, watchlist is now string[]"
```

---

### Task 3: Create InvestorDataAdapter (TDD)

**Files:**
- Create: `src/adapters/InvestorDataAdapter.ts`
- Create: `src/adapters/InvestorDataAdapter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/adapters/InvestorDataAdapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvestorDataAdapter } from './InvestorDataAdapter'

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
})
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx vitest run src/adapters/InvestorDataAdapter.test.ts 2>&1 | tail -10
```
Expected: FAIL — `InvestorDataAdapter` not found

- [ ] **Step 3: Implement `src/adapters/InvestorDataAdapter.ts`**

```ts
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

  constructor(private readonly baseUrl: string = 'http://localhost:3000') {}

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
    await this.fetchAll()
  }

  async removeTicker(symbol: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol }),
    })
    if (!res.ok) throw new Error(`removeTicker failed: ${res.status}`)
    await this.fetchAll()
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
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx vitest run src/adapters/InvestorDataAdapter.test.ts 2>&1
```
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/adapters/InvestorDataAdapter.ts src/adapters/InvestorDataAdapter.test.ts
git commit -m "feat: add InvestorDataAdapter with batch fetch and cache"
```

---

## Chunk 2: Stores, Context, Routing, DollarFooter

---

### Task 4: Create `src/config.ts`

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Create the file**

```ts
export const INVESTOR_DATA_URL =
  import.meta.env.VITE_INVESTOR_DATA_URL ?? 'http://localhost:3000'
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add INVESTOR_DATA_URL config"
```

---

### Task 5: Update Zustand Stores

**Files:**
- Modify: `src/stores/watchlistStore.ts`
- Modify: `src/stores/preferencesStore.ts`

- [ ] **Step 1: Replace `src/stores/watchlistStore.ts`**

Items are now plain `string[]`. `setItems` replaces `addItem`/`removeItem` — the adapter owns mutations, the store is a reactive cache.

```ts
import { create } from 'zustand'
import { loadWatchlist, saveWatchlist } from '../utils/storage'

interface WatchlistState {
  items: string[]
  setItems: (items: string[]) => void
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  items: loadWatchlist(),
  setItems: (items) => {
    saveWatchlist(items)
    set({ items })
  },
}))
```

- [ ] **Step 2: Replace `src/stores/preferencesStore.ts`**

Remove `'1y'` from `VariationPeriod` (no longer supported).

```ts
import { create } from 'zustand'
import { loadPreferences, savePreferences } from '../utils/storage'
import type { VariationPeriod } from '../adapters/types'

interface PreferencesState {
  variationPeriod: VariationPeriod
  setVariationPeriod: (period: VariationPeriod) => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  variationPeriod: loadPreferences().variationPeriod,

  setVariationPeriod: (period) => {
    savePreferences({ variationPeriod: period })
    set({ variationPeriod: period })
  },
}))
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx vitest run 2>&1 | tail -10
```
Expected: All passing

- [ ] **Step 4: Commit**

```bash
git add src/stores/watchlistStore.ts src/stores/preferencesStore.ts
git commit -m "feat: simplify watchlistStore to string[], update preferencesStore"
```

---

### Task 6: Update AdapterContext and App.tsx Routing

**Files:**
- Modify: `src/AdapterContext.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace `src/AdapterContext.tsx`**

```tsx
import React, { createContext, useContext, useRef } from 'react'
import { InvestorDataAdapter } from './adapters/InvestorDataAdapter'
import type { DataProvider } from './adapters/types'
import { INVESTOR_DATA_URL } from './config'

const AdapterContext = createContext<DataProvider | null>(null)

export function AdapterProvider({ children }: { children: React.ReactNode }) {
  const adapterRef = useRef<DataProvider>(new InvestorDataAdapter(INVESTOR_DATA_URL))
  return (
    <AdapterContext.Provider value={adapterRef.current}>
      {children}
    </AdapterContext.Provider>
  )
}

export function useAdapter(): DataProvider {
  const ctx = useContext(AdapterContext)
  if (!ctx) throw new Error('useAdapter must be used within AdapterProvider')
  return ctx
}
```

- [ ] **Step 2: Replace `src/App.tsx`**

Remove `RequireAuth`, `LoginScreen`, update routes for new screens.

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WatchlistScreen from './screens/WatchlistScreen'
import AssetDetailScreen from './screens/AssetDetailScreen'
import AddTickerScreen from './screens/AddTickerScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WatchlistScreen />} />
        <Route path="/asset/:symbol" element={<AssetDetailScreen />} />
        <Route path="/add" element={<AddTickerScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx tsc --noEmit 2>&1
```
Expected: no errors (there may be errors from screens that still reference old types — that's OK at this stage, fix them as screens are rewritten in Tasks 8–10)

- [ ] **Step 4: Commit**

```bash
git add src/AdapterContext.tsx src/App.tsx
git commit -m "feat: update AdapterContext to use InvestorDataAdapter, remove auth from routing"
```

---

### Task 7: Create DollarFooter Component

**Files:**
- Create: `src/components/DollarFooter.tsx`

- [ ] **Step 1: Create `src/components/DollarFooter.tsx`**

```tsx
import { calcVariation } from '../utils/variation'
import VariationBadge from './VariationBadge'
import type { DollarRates } from '../adapters/types'

interface Props {
  rates: DollarRates
  historyRates: DollarRates
}

const LABELS: { key: keyof DollarRates; label: string }[] = [
  { key: 'oficial', label: 'Oficial' },
  { key: 'blue', label: 'Blue' },
  { key: 'bolsa', label: 'Bolsa' },
  { key: 'contadoconliqui', label: 'CCL' },
]

export default function DollarFooter({ rates, historyRates }: Props) {
  return (
    <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {LABELS.map(({ key, label }) => {
          const current = rates[key]
          const reference = historyRates[key]
          const variation = current !== null ? calcVariation(current, reference ?? undefined) : null
          return (
            <div key={key} className="flex-shrink-0 text-center">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-white">
                {current !== null ? `$${current.toLocaleString('es-AR')}` : '—'}
              </p>
              <VariationBadge value={variation} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/components/DollarFooter.tsx
git commit -m "feat: add DollarFooter component"
```

---

## Chunk 3: Screens and Cleanup

---

### Task 8: Rewrite WatchlistScreen

**Files:**
- Modify: `src/screens/WatchlistScreen.tsx`

- [ ] **Step 1: Replace `src/screens/WatchlistScreen.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import DollarFooter from '../components/DollarFooter'
import type { VariationPeriod } from '../adapters/types'

type ScreenStatus = 'loading' | 'error' | 'loaded'

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': '1D',
  '1w': '1S',
  '1m': '1M',
  '3m': '3M',
}

export default function WatchlistScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { items, setItems } = useWatchlistStore()
  const { variationPeriod, setVariationPeriod } = usePreferencesStore()
  const [status, setStatus] = useState<ScreenStatus>('loading')

  useEffect(() => {
    setStatus('loading')
    adapter.fetchAll()
      .then(() => {
        setItems(adapter.getWatchlist())
        setStatus('loaded')
      })
      .catch(() => setStatus('error'))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const prices = adapter.isReady() ? adapter.getPrices() : {}
  const histPrices = adapter.isReady() ? adapter.getHistoryPrices(variationPeriod) : {}

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
        <h1 className="font-semibold text-lg">Mi Watchlist</h1>
        <div className="flex gap-1">
          {(Object.entries(PERIOD_LABELS) as [VariationPeriod, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setVariationPeriod(val)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                variationPeriod === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 divide-y divide-gray-800">
        {status === 'error' && (
          <div className="p-6 text-center">
            <p className="text-red-400 text-sm mb-3">No se pudieron cargar los datos.</p>
            <button
              onClick={() => {
                setStatus('loading')
                adapter.fetchAll()
                  .then(() => { setItems(adapter.getWatchlist()); setStatus('loaded') })
                  .catch(() => setStatus('error'))
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        )}

        {status === 'loading' && items.length === 0 && (
          <p className="text-gray-500 text-center py-16 text-sm">Cargando...</p>
        )}

        {(status === 'loading' && items.length > 0 ? items : status === 'loaded' ? items : []).map(symbol => {
          const current = prices[symbol]
          const hist = histPrices[symbol]
          const isLoading = status === 'loading'
          const variation = current && hist ? calcVariation(current.ars, hist.ars ?? undefined) : null

          return (
            <button
              key={symbol}
              onClick={() => navigate(`/asset/${symbol}`)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-900 transition-colors text-left"
            >
              <div>
                <p className="font-medium">{symbol}</p>
              </div>
              <div className="text-right">
                {isLoading ? (
                  <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="font-medium text-sm">
                      {current ? `$${current.ars.toLocaleString('es-AR')}` : '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {current ? `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}` : ''}
                    </p>
                    <VariationBadge value={variation} />
                  </>
                )}
              </div>
            </button>
          )
        })}

        {status === 'loaded' && items.length === 0 && (
          <p className="text-gray-500 text-center py-16 text-sm">
            Tu watchlist está vacía.<br />Tocá + para agregar activos.
          </p>
        )}
      </div>

      {/* Dollar footer */}
      {adapter.isReady() && (
        <DollarFooter
          rates={adapter.getDollarRates()}
          historyRates={adapter.getHistoryDollarRates(variationPeriod)}
        />
      )}

      {/* Add button */}
      <button
        onClick={() => navigate('/add')}
        className="fixed bottom-20 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 text-2xl flex items-center justify-center shadow-lg transition-colors"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/WatchlistScreen.tsx
git commit -m "feat: rewrite WatchlistScreen with new data model and dollar footer"
```

---

### Task 9: Rewrite AssetDetailScreen

**Files:**
- Modify: `src/screens/AssetDetailScreen.tsx`

- [ ] **Step 1: Replace `src/screens/AssetDetailScreen.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod } from '../adapters/types'

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': '1D',
  '1w': '1S',
  '1m': '1M',
  '3m': '3M',
}

export default function AssetDetailScreen() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const adapter = useAdapter()

  if (!symbol) return null

  const prices = adapter.getPrices()
  const allHistory = adapter.getAllHistoryPrices()
  const current = prices[symbol]

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="font-semibold text-lg">{symbol}</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Current price */}
        <div>
          {current ? (
            <>
              <p className="text-3xl font-bold">${current.ars.toLocaleString('es-AR')}</p>
              <p className="text-gray-400 text-sm mt-1">
                u$s {current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}
              </p>
            </>
          ) : (
            <p className="text-gray-500">Sin datos disponibles</p>
          )}
        </div>

        {/* Variation grid */}
        {current && (
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(PERIOD_LABELS) as [VariationPeriod, string][]).map(([period, label]) => {
              const hist = allHistory[period][symbol]
              const variation = hist ? calcVariation(current.ars, hist.ars ?? undefined) : null
              return (
                <div key={period} className="bg-gray-900 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <VariationBadge value={variation} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/AssetDetailScreen.tsx
git commit -m "feat: rewrite AssetDetailScreen — all periods, no chart"
```

---

### Task 10: Create AddTickerScreen

**Files:**
- Create: `src/screens/AddTickerScreen.tsx`

- [ ] **Step 1: Create `src/screens/AddTickerScreen.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'

type OpStatus = { type: 'idle' } | { type: 'loading' } | { type: 'error'; message: string }

function getErrorMessage(err: unknown, operation: 'add' | 'remove'): string {
  const msg = err instanceof Error ? err.message : ''
  if (operation === 'add') {
    if (msg.includes('409')) return 'El ticker ya existe.'
    return 'No se pudo agregar. Intentá de nuevo.'
  } else {
    if (msg.includes('404')) return 'Ticker no encontrado.'
    return 'No se pudo quitar. Intentá de nuevo.'
  }
  if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
    return 'Error de conexión. Verificá tu red.'
  }
}

export default function AddTickerScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { items, setItems } = useWatchlistStore()
  const [symbol, setSymbol] = useState('')
  const [addStatus, setAddStatus] = useState<OpStatus>({ type: 'idle' })
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({})

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const s = symbol.trim().toUpperCase()
    if (!s) return
    setAddStatus({ type: 'loading' })
    try {
      await adapter.addTicker(s)
      setItems(adapter.getWatchlist())
      setSymbol('')
      setAddStatus({ type: 'idle' })
    } catch (err) {
      const isNetwork = err instanceof TypeError
      const msg = isNetwork
        ? 'Error de conexión. Verificá tu red.'
        : getErrorMessage(err, 'add')
      setAddStatus({ type: 'error', message: msg ?? 'No se pudo agregar. Intentá de nuevo.' })
    }
  }

  async function handleRemove(sym: string) {
    setRemoveErrors(prev => ({ ...prev, [sym]: '' }))
    try {
      await adapter.removeTicker(sym)
      setItems(adapter.getWatchlist())
    } catch (err) {
      const isNetwork = err instanceof TypeError
      const msg = isNetwork
        ? 'Error de conexión. Verificá tu red.'
        : getErrorMessage(err, 'remove')
      setRemoveErrors(prev => ({ ...prev, [sym]: msg ?? 'No se pudo quitar. Intentá de nuevo.' }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="font-semibold">Gestionar activos</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Add form */}
        <div>
          <p className="text-sm text-gray-400 mb-3">Agregar ticker</p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="Ej: GGAL"
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2.5 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={addStatus.type === 'loading' || !symbol.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium transition-colors"
            >
              {addStatus.type === 'loading' ? '...' : 'Agregar'}
            </button>
          </form>
          {addStatus.type === 'error' && (
            <p className="text-red-400 text-sm mt-2">{addStatus.message}</p>
          )}
        </div>

        {/* Current tickers */}
        {items.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-3">Activos en seguimiento</p>
            <div className="divide-y divide-gray-800 rounded-xl overflow-hidden">
              {items.map(sym => (
                <div key={sym} className="bg-gray-900 flex items-center justify-between px-4 py-3">
                  <span className="font-mono font-medium">{sym}</span>
                  <div className="text-right">
                    {removeErrors[sym] && (
                      <p className="text-red-400 text-xs mb-1">{removeErrors[sym]}</p>
                    )}
                    <button
                      onClick={() => handleRemove(sym)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx tsc --noEmit 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/AddTickerScreen.tsx
git commit -m "feat: add AddTickerScreen with add form and remove list"
```

---

### Task 11: Delete Old Files and Run Full Test Suite

**Files to delete:**
- `src/adapters/IoLAdapter.ts`
- `src/adapters/IoLAdapter.test.ts`
- `src/stores/authStore.ts`
- `src/screens/LoginScreen.tsx`
- `src/screens/SymbolSearchScreen.tsx`
- `src/components/PriceChart.tsx`

- [ ] **Step 1: Delete obsolete files**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && rm src/adapters/IoLAdapter.ts src/adapters/IoLAdapter.test.ts src/stores/authStore.ts src/screens/LoginScreen.tsx src/screens/SymbolSearchScreen.tsx src/components/PriceChart.tsx
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx tsc --noEmit 2>&1
```
Expected: no errors

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npx vitest run 2>&1
```
Expected: all tests pass

- [ ] **Step 4: Build**

```bash
cd /Users/marcos/Documents/Programacion/assetTracker/.worktrees/feat-initial-implementation && npm run build 2>&1 | tail -10
```
Expected: clean build

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove IoLAdapter, authStore, LoginScreen, PriceChart, SymbolSearchScreen"
```
