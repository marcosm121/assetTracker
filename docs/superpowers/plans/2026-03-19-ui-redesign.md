# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate assetTracker from a dark single-page layout to a light-themed, card-based UI with a 3-tab bottom navigation bar (Watchlist, Dólares, Noticias).

**Architecture:** A new `BottomNav` component handles tab routing; `App.tsx` adds routes for `/dolares` and `/noticias` and renders the nav. All screens are rewritten/adapted to the light theme. The existing `DollarFooter` is replaced by a dedicated `DolaresScreen`. Data layer (adapters, stores) is untouched.

**Tech Stack:** React, TypeScript, Tailwind CSS, react-router-dom, Zustand

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/utils/companyNames.ts` | Create | Static ticker → company name mapping |
| `src/utils/companyNames.test.ts` | Create | Unit tests for the lookup |
| `src/components/VariationBadge.tsx` | Modify | Update arrows (▲▼ → ↗↘) and colors (400 → 600) |
| `src/index.css` | Modify | Set body background to slate-100 |
| `src/components/BottomNav.tsx` | Create | 3-tab bottom nav bar |
| `src/App.tsx` | Modify | Add routes + render BottomNav |
| `src/screens/DolaresScreen.tsx` | Create | Dollar rates with variation by period |
| `src/screens/NoticiasScreen.tsx` | Create | Placeholder screen |
| `src/screens/WatchlistScreen.tsx` | Modify | Full visual rewrite (light theme + cards) |
| `src/screens/AssetDetailScreen.tsx` | Modify | Full visual rewrite (light theme + historial list) |
| `src/screens/AddTickerScreen.tsx` | Modify | Light theme adaptation |
| `src/components/DollarFooter.tsx` | Delete | Replaced by DolaresScreen |

---

## Task 1: Company name utility

**Files:**
- Create: `src/utils/companyNames.ts`
- Create: `src/utils/companyNames.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/companyNames.test.ts
import { getCompanyName } from './companyNames'

describe('getCompanyName', () => {
  it('returns the company name for a known ticker', () => {
    expect(getCompanyName('GGAL')).toBe('Grupo Financiero Galicia')
  })

  it('returns empty string for an unknown ticker', () => {
    expect(getCompanyName('UNKNOWN')).toBe('')
  })

  it('is case-sensitive (tickers are always uppercase)', () => {
    expect(getCompanyName('ggal')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/utils/companyNames.test.ts
```
Expected: FAIL — `Cannot find module './companyNames'`

- [ ] **Step 3: Implement**

```typescript
// src/utils/companyNames.ts
const COMPANY_NAMES: Record<string, string> = {
  GGAL:  'Grupo Financiero Galicia',
  YPFD:  'YPF S.A.',
  BMA:   'Banco Macro',
  BBAR:  'BBVA Argentina',
  PAMP:  'Pampa Energía',
  TECO2: 'Telecom Argentina',
  ALUA:  'Aluar Aluminio',
  TXAR:  'Ternium Argentina',
  SUPV:  'Grupo Supervielle',
  CEPU:  'Central Puerto',
  CRES:  'Cresud',
  LOMA:  'Loma Negra',
  MIRG:  'Mirgor',
  VALO:  'Grupo Financiero Valores',
}

export function getCompanyName(ticker: string): string {
  return COMPANY_NAMES[ticker] ?? ''
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/utils/companyNames.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/companyNames.ts src/utils/companyNames.test.ts
git commit -m "feat: add company name static mapping utility"
```

---

## Task 2: VariationBadge — update arrows and colors

**Files:**
- Modify: `src/components/VariationBadge.tsx`

The current component uses `▲`/`▼` (vertical) and `text-green-400`/`text-red-400`. The light theme needs diagonal arrows and darker colors for contrast.

- [ ] **Step 1: Update VariationBadge**

Replace the full file content:

```typescript
// src/components/VariationBadge.tsx
interface Props {
  value: number | null
}

export default function VariationBadge({ value }: Props) {
  if (value === null) return <span className="text-slate-400 text-sm">—</span>

  const positive = value >= 0
  const color = positive ? 'text-green-600' : 'text-red-600'
  const arrow = positive ? '↗' : '↘'
  const display = `${positive ? '+' : ''}${value.toFixed(2)}%`

  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {display}
    </span>
  )
}
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
npm test
```
Expected: all tests pass (VariationBadge has no unit test; this confirms no regressions elsewhere)

- [ ] **Step 3: Commit**

```bash
git add src/components/VariationBadge.tsx
git commit -m "feat: update VariationBadge arrows to diagonal and darken colors for light theme"
```

---

## Task 3: NoticiasScreen (placeholder)

**Files:**
- Create: `src/screens/NoticiasScreen.tsx`

Created early so App.tsx can import it without a broken build state.

- [ ] **Step 1: Create the placeholder screen**

```typescript
// src/screens/NoticiasScreen.tsx
export default function NoticiasScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
      <span className="text-5xl">📰</span>
      <h2 className="text-xl font-bold text-slate-900">Noticias</h2>
      <p className="text-slate-400 text-sm">Próximamente</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/NoticiasScreen.tsx
git commit -m "feat: add Noticias placeholder screen"
```

---

## Task 4: DolaresScreen

**Files:**
- Create: `src/screens/DolaresScreen.tsx`

Created early so App.tsx can import it without a broken build state. Data comes from the adapter cache (already loaded by WatchlistScreen's `fetchAll()`). The screen assumes the cache is warm; if not, it shows `—` for all values (same null-handling the DollarFooter used).

- [ ] **Step 1: Create DolaresScreen**

```typescript
// src/screens/DolaresScreen.tsx
import { useAdapter } from '../AdapterContext'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import type { DollarRates, VariationPeriod } from '../adapters/types'

const DOLLAR_LABELS: { key: keyof DollarRates; label: string }[] = [
  { key: 'oficial',         label: 'Oficial' },
  { key: 'blue',            label: 'Blue' },
  { key: 'bolsa',           label: 'Bolsa' },
  { key: 'contadoconliqui', label: 'CCL' },
]

const PERIOD_OPTIONS: { value: VariationPeriod; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
]

export default function DolaresScreen() {
  const adapter = useAdapter()
  const { variationPeriod, setVariationPeriod } = usePreferencesStore()

  const rates = adapter.isReady() ? adapter.getDollarRates() : {}
  const histRates = adapter.isReady() ? adapter.getHistoryDollarRates(variationPeriod) : {}

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 pt-3 pb-0 z-10">
        <h1 className="font-bold text-lg text-slate-900 mb-2">Dólares</h1>
        {/* Period pills */}
        <div className="flex gap-1 pb-3">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setVariationPeriod(value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                variationPeriod === value
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {DOLLAR_LABELS.map(({ key, label }) => {
          const current = rates[key] ?? null
          const hist = histRates[key] ?? undefined
          const variation = current !== null ? calcVariation(current, hist) : null
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-slate-900">{label}</span>
              <div className="text-right">
                <p className="font-bold text-slate-900">
                  {current !== null ? `$${current.toLocaleString('es-AR')}` : '—'}
                </p>
                <VariationBadge value={variation} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/screens/DolaresScreen.tsx
git commit -m "feat: add DolaresScreen with period variation"
```

---

## Task 5: Global background + BottomNav + routing

**Files:**
- Modify: `src/index.css`
- Create: `src/components/BottomNav.tsx`
- Modify: `src/App.tsx`

This task wires up the whole navigation shell. DolaresScreen and NoticiasScreen already exist (Tasks 3–4), so App.tsx imports them without build errors.

- [ ] **Step 1: Set body background in index.css**

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #f1f5f9; /* slate-100 */
}
```

- [ ] **Step 2: Create BottomNav component**

```typescript
// src/components/BottomNav.tsx
import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/',         label: 'WATCHLIST', icon: '★' },
  { path: '/dolares',  label: 'DÓLARES',   icon: '$' },
  { path: '/noticias', label: 'NOTICIAS',  icon: '📰' },
] as const

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Don't highlight any tab for overlay screens
  const activeTab = ['/', '/dolares', '/noticias'].includes(pathname) ? pathname : '/'

  return (
    <nav className="bg-white border-t border-slate-200 flex">
      {TABS.map(({ path, label, icon }) => {
        const active = activeTab === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
              active ? 'text-slate-800' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-slate-800' : 'text-slate-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 3: Update App.tsx — add routes and render BottomNav**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WatchlistScreen from './screens/WatchlistScreen'
import AssetDetailScreen from './screens/AssetDetailScreen'
import AddTickerScreen from './screens/AddTickerScreen'
import DolaresScreen from './screens/DolaresScreen'
import NoticiasScreen from './screens/NoticiasScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<WatchlistScreen />} />
            <Route path="/asset/:symbol" element={<AssetDetailScreen />} />
            <Route path="/add" element={<AddTickerScreen />} />
            <Route path="/dolares" element={<DolaresScreen />} />
            <Route path="/noticias" element={<NoticiasScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/BottomNav.tsx src/App.tsx
git commit -m "feat: add bottom nav shell and routing for Dólares and Noticias tabs"
```

---

## Task 6: WatchlistScreen — full visual rewrite

**Files:**
- Modify: `src/screens/WatchlistScreen.tsx`

The screen removes the DollarFooter import and rewrites the layout to light theme with card rows. The ARS/USD toggle moves to the header row 1 (right side). Period pills move to header row 2 with the `+` button.

- [ ] **Step 1: Rewrite WatchlistScreen**

```typescript
// src/screens/WatchlistScreen.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import { getCompanyName } from '../utils/companyNames'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod } from '../adapters/types'

type ScreenStatus = 'loading' | 'error' | 'loaded'

const PERIOD_OPTIONS: { value: VariationPeriod; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
]

export default function WatchlistScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { items, setItems } = useWatchlistStore()
  const { variationPeriod, setVariationPeriod, currency, setCurrency } = usePreferencesStore()
  const [status, setStatus] = useState<ScreenStatus>('loading')

  useEffect(() => {
    if (adapter.isReady()) {
      setItems(adapter.getWatchlist())
      setStatus('loaded')
      return
    }
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 pt-3 pb-0 z-10">
        {/* Row 1: title + ARS/USD toggle */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-lg text-slate-900">Mi Watchlist</h1>
          <div className="flex bg-slate-100 rounded-full p-0.5">
            <button
              onClick={() => setCurrency('usd')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                currency === 'usd' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('ars')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                currency === 'ars' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              ARS
            </button>
          </div>
        </div>
        {/* Row 2: period pills + add button */}
        <div className="flex items-center gap-1 pb-3">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setVariationPeriod(value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                variationPeriod === value
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => navigate('/add')}
            className="ml-auto w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-lg font-bold transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {status === 'error' && (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-3">No se pudieron cargar los datos.</p>
            <button
              onClick={() => {
                setStatus('loading')
                adapter.fetchAll()
                  .then(() => { setItems(adapter.getWatchlist()); setStatus('loaded') })
                  .catch(() => setStatus('error'))
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        )}

        {status === 'loading' && items.length === 0 && (
          <p className="text-slate-400 text-center py-16 text-sm">Cargando...</p>
        )}

        {(status === 'loading' && items.length > 0 ? items : status === 'loaded' ? items : []).map(symbol => {
          const current = prices[symbol]
          const hist = histPrices[symbol]
          const isLoading = status === 'loading'
          const variation = current && hist
            ? currency === 'ars'
              ? calcVariation(current.ars, hist.ars ?? undefined)
              : calcVariation(current.usd, hist.usd ?? undefined)
            : null
          const companyName = getCompanyName(symbol)

          return (
            <button
              key={symbol}
              onClick={() => navigate(`/asset/${symbol}`)}
              className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow w-full"
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: '#dde3f5', color: '#4a5fa0' }}
              >
                {symbol[0]}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{symbol}</p>
                {companyName && (
                  <p className="text-xs text-slate-400 truncate">{companyName}</p>
                )}
              </div>
              {/* Price + variation */}
              <div className="text-right flex-shrink-0">
                {isLoading ? (
                  <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-sm">
                      {current
                        ? currency === 'ars'
                          ? `$${current.ars.toLocaleString('es-AR')}`
                          : `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}`
                        : '—'}
                    </p>
                    <VariationBadge value={variation} />
                  </>
                )}
              </div>
            </button>
          )
        })}

        {status === 'loaded' && items.length === 0 && (
          <p className="text-slate-400 text-center py-16 text-sm">
            Tu watchlist está vacía.<br />Tocá + para agregar activos.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/screens/WatchlistScreen.tsx
git commit -m "feat: rewrite WatchlistScreen to light theme with card layout"
```

---

## Task 7: AssetDetailScreen — full visual rewrite

**Files:**
- Modify: `src/screens/AssetDetailScreen.tsx`

Key changes: light theme, ARS/USD toggle in header, hero with large price + variation pill for current period, vertical historial list with historical price + variation per period.

Period label mapping for hero: `1d` → "Hoy", `1w` → "Esta semana", `1m` → "Este mes", `3m` → "Últimos 3 meses".

Historical price format: same as current price (ARS or USD per `currency` toggle).

- [ ] **Step 1: Rewrite AssetDetailScreen**

```typescript
// src/screens/AssetDetailScreen.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import { getCompanyName } from '../utils/companyNames'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod } from '../adapters/types'

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': 'Diario',
  '1w': 'Semanal',
  '1m': 'Mensual',
  '3m': 'Trimestral',
}

const HERO_PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': 'Hoy',
  '1w': 'Esta semana',
  '1m': 'Este mes',
  '3m': 'Últimos 3 meses',
}

const PERIOD_ORDER: VariationPeriod[] = ['1d', '1w', '1m', '3m']

export default function AssetDetailScreen() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { currency, setCurrency, variationPeriod } = usePreferencesStore()

  if (!symbol) return null

  const prices = adapter.getPrices()
  const allHistory = adapter.getAllHistoryPrices()
  const current = prices[symbol]
  const companyName = getCompanyName(symbol)

  const heroHist = allHistory[variationPeriod][symbol]
  const heroVariation = current && heroHist
    ? currency === 'ars'
      ? calcVariation(current.ars, heroHist.ars ?? undefined)
      : calcVariation(current.usd, heroHist.usd ?? undefined)
    : null

  function formatPrice(ars: number | null, usd: number | null): string {
    if (currency === 'ars') {
      return ars !== null ? `$${ars.toLocaleString('es-AR')}` : '—'
    }
    return usd !== null ? `u$s ${usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}` : '—'
  }

  const currentPriceStr = current ? formatPrice(current.ars, current.usd) : '—'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 text-xl">←</button>
          <span className="font-bold text-slate-900">{symbol}</span>
        </div>
        <div className="flex bg-slate-100 rounded-full p-0.5">
          <button
            onClick={() => setCurrency('usd')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              currency === 'usd' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            USD
          </button>
          <button
            onClick={() => setCurrency('ars')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              currency === 'ars' ? 'bg-slate-800 text-white' : 'text-slate-400'
            }`}
          >
            ARS
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-2xl font-black text-slate-900 leading-none">{symbol}</p>
          {companyName && <p className="text-sm text-slate-400 mt-0.5 mb-2">{companyName}</p>}
          <p className="text-4xl font-black text-slate-900 mt-1">{currentPriceStr}</p>
          {heroVariation !== null && (
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
              heroVariation >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <span>{heroVariation >= 0 ? '↗' : '↘'} {heroVariation >= 0 ? '+' : ''}{heroVariation.toFixed(2)}%</span>
              <span className={heroVariation >= 0 ? 'text-green-400' : 'text-red-300'}>
                {HERO_PERIOD_LABELS[variationPeriod]}
              </span>
            </div>
          )}
        </div>

        {/* Historial */}
        {current && (
          <div className="mx-3 mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Historial</h2>
            </div>
            {PERIOD_ORDER.map((period, i) => {
              const hist = allHistory[period][symbol]
              const variation = hist
                ? currency === 'ars'
                  ? calcVariation(current.ars, hist.ars ?? undefined)
                  : calcVariation(current.usd, hist.usd ?? undefined)
                : null
              const histPriceStr = hist ? formatPrice(hist.ars, hist.usd) : '—'

              return (
                <div
                  key={period}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < PERIOD_ORDER.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: '#dde3f5', color: '#4a5fa0' }}
                  >
                    {period === '1d' ? '1D' : period === '1w' ? '1S' : period === '1m' ? '1M' : '3M'}
                  </div>
                  <span className="flex-1 text-sm text-slate-500">{PERIOD_LABELS[period]}</span>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">{histPriceStr}</p>
                    <VariationBadge value={variation} />
                  </div>
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

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/screens/AssetDetailScreen.tsx
git commit -m "feat: rewrite AssetDetailScreen to light theme with historial list"
```

---

## Task 8: AddTickerScreen — light theme adaptation

**Files:**
- Modify: `src/screens/AddTickerScreen.tsx`

Logic is unchanged. Visual update only: white background, slate inputs, light dividers.

- [ ] **Step 1: Update AddTickerScreen**

```typescript
// src/screens/AddTickerScreen.tsx
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
      setAddStatus({ type: 'error', message: msg })
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
      setRemoveErrors(prev => ({ ...prev, [sym]: msg }))
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 text-xl">←</button>
        <h1 className="font-bold text-slate-900">Gestionar activos</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Add form */}
        <div>
          <p className="text-sm text-slate-500 mb-3">Agregar ticker</p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="Ej: GGAL"
              className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={addStatus.type === 'loading' || !symbol.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors"
            >
              {addStatus.type === 'loading' ? '...' : 'Agregar'}
            </button>
          </form>
          {addStatus.type === 'error' && (
            <p className="text-red-500 text-sm mt-2">{addStatus.message}</p>
          )}
        </div>

        {/* Current tickers */}
        {items.length > 0 && (
          <div>
            <p className="text-sm text-slate-500 mb-3">Activos en seguimiento</p>
            <div className="divide-y divide-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
              {items.map(sym => (
                <div key={sym} className="flex items-center justify-between px-4 py-3">
                  <span className="font-mono font-semibold text-slate-900">{sym}</span>
                  <div className="text-right">
                    {removeErrors[sym] && (
                      <p className="text-red-500 text-xs mb-1">{removeErrors[sym]}</p>
                    )}
                    <button
                      onClick={() => handleRemove(sym)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
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

- [ ] **Step 2: Run tests**

```bash
npm test
```
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/screens/AddTickerScreen.tsx
git commit -m "feat: adapt AddTickerScreen to light theme"
```

---

## Task 9: Remove DollarFooter

**Files:**
- Delete: `src/components/DollarFooter.tsx`

`WatchlistScreen` was already rewritten in Task 6 without importing DollarFooter, so by this point no file imports it.

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "DollarFooter" src/
```
Expected: no output (zero matches)

- [ ] **Step 2: Delete the file**

```bash
rm src/components/DollarFooter.tsx
```

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: all pass

- [ ] **Step 4: Build to confirm no dead imports**

```bash
npm run build
```
Expected: build succeeds with no errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove DollarFooter component (replaced by DolaresScreen)"
```
