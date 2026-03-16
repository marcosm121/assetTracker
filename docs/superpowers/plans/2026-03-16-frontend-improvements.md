# Frontend Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an ARS/USD currency switch to the header, make the DollarFooter always visible, and move the + button into the header.

**Architecture:** All changes are confined to existing files — no new files needed. The `currency` state is added to `preferencesStore` without persistence. `DollarFooter` props become optional `Partial<DollarRates>` to support rendering before data loads. `WatchlistScreen` and `AssetDetailScreen` read `currency` from the store to toggle price display.

**Tech Stack:** React, TypeScript, Tailwind CSS, Zustand

---

## Chunk 1: Store + DollarFooter (foundation)

### Task 1: Add `currency` to `preferencesStore`

**Files:**
- Modify: `src/stores/preferencesStore.ts`

- [ ] **Step 1: Open `src/stores/preferencesStore.ts` and read current content**

The file currently has:
```ts
interface PreferencesState {
  variationPeriod: VariationPeriod
  setVariationPeriod: (period: VariationPeriod) => void
}
```

- [ ] **Step 2: Add `currency` to the interface and store initializer**

Replace the interface and store so the file reads:

```ts
import { create } from 'zustand'
import { loadPreferences, savePreferences } from '../utils/storage'
import type { VariationPeriod } from '../adapters/types'

interface PreferencesState {
  variationPeriod: VariationPeriod
  setVariationPeriod: (period: VariationPeriod) => void
  currency: 'ars' | 'usd'
  setCurrency: (c: 'ars' | 'usd') => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  variationPeriod: loadPreferences().variationPeriod,

  setVariationPeriod: (period) => {
    savePreferences({ variationPeriod: period })
    set({ variationPeriod: period })
  },

  currency: 'ars',
  setCurrency: (c) => set({ currency: c }),
}))
```

Key points:
- `currency` is hardcoded to `'ars'` — NOT read from `loadPreferences()`
- `setCurrency` does NOT call `savePreferences`
- `storage.ts` is NOT touched

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/stores/preferencesStore.ts
git commit -m "feat: add ephemeral currency preference to preferencesStore"
```

---

### Task 2: Make `DollarFooter` props optional

**Files:**
- Modify: `src/components/DollarFooter.tsx`

- [ ] **Step 1: Read `src/components/DollarFooter.tsx`**

Note the current `Props` interface and the `LABELS.map` callback:
```ts
interface Props {
  rates: DollarRates
  historyRates: DollarRates
}
// ...
const current = rates[key]
const reference = historyRates[key]
const variation = current !== null ? calcVariation(current, reference ?? undefined) : null
```

- [ ] **Step 2: Update props and normalize reads**

Change the file to:

```ts
import { calcVariation } from '../utils/variation'
import VariationBadge from './VariationBadge'
import type { DollarRates } from '../adapters/types'

interface Props {
  rates?: Partial<DollarRates>
  historyRates?: Partial<DollarRates>
}

const LABELS: { key: keyof DollarRates; label: string }[] = [
  { key: 'oficial', label: 'Oficial' },
  { key: 'blue', label: 'Blue' },
  { key: 'bolsa', label: 'Bolsa' },
  { key: 'contadoconliqui', label: 'CCL' },
]

export default function DollarFooter({ rates = {}, historyRates = {} }: Props) {
  return (
    <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {LABELS.map(({ key, label }) => {
          const current = rates[key] ?? null
          const reference = historyRates[key] ?? undefined
          const variation = current !== null ? calcVariation(current, reference) : null
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

Changes from original:
- `rates` and `historyRates` are now optional, defaulting to `{}`
- `const current = rates[key] ?? null` — normalizes `undefined` to `null`
- `const reference = historyRates[key] ?? undefined` — normalizes `null` to `undefined` for `calcVariation`
- `calcVariation(current, reference)` — `reference` is already `number | undefined`, no extra `?? undefined` needed

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/components/DollarFooter.tsx
git commit -m "feat: make DollarFooter props optional for pre-load rendering"
```

---

## Chunk 2: WatchlistScreen

### Task 3: Restructure header, remove FAB, add ARS/USD switch, currency-aware rows

**Files:**
- Modify: `src/screens/WatchlistScreen.tsx`

- [ ] **Step 1: Read `src/screens/WatchlistScreen.tsx`**

Understand the full current structure: header, content rows, DollarFooter, and fixed FAB at the bottom.

- [ ] **Step 2: Rewrite `WatchlistScreen.tsx`**

Replace the entire file with:

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
  const { variationPeriod, setVariationPeriod, currency, setCurrency } = usePreferencesStore()
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
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex flex-col gap-2 z-10">
        {/* Row 1: title + period pills + add button */}
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg">Mi Watchlist</h1>
          <div className="flex gap-1 items-center">
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
            <button
              onClick={() => navigate('/add')}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg transition-colors"
            >
              +
            </button>
          </div>
        </div>
        {/* Row 2: ARS/USD switch */}
        <div className="flex justify-center">
          <div className="flex bg-gray-800 rounded-full p-0.5">
            <button
              onClick={() => setCurrency('ars')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${
                currency === 'ars' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              ARS $
            </button>
            <button
              onClick={() => setCurrency('usd')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${
                currency === 'usd' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              USD u$s
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 divide-y divide-gray-800 overflow-y-auto">
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
          const variation = current && hist
            ? currency === 'ars'
              ? calcVariation(current.ars, hist.ars ?? undefined)
              : calcVariation(current.usd, hist.usd ?? undefined)
            : null

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
          <p className="text-gray-500 text-center py-16 text-sm">
            Tu watchlist está vacía.<br />Tocá + para agregar activos.
          </p>
        )}
      </div>

      {/* Dollar footer — always visible */}
      <DollarFooter
        rates={adapter.isReady() ? adapter.getDollarRates() : undefined}
        historyRates={adapter.isReady() ? adapter.getHistoryDollarRates(variationPeriod) : undefined}
      />
    </div>
  )
}
```

Key changes from original:
- Fixed FAB button removed entirely
- Header is now `flex flex-col gap-2`
- Row 1: title + period pills + inline `+` button
- Row 2: ARS/USD segmented switch calling `setCurrency`
- Content area has `overflow-y-auto`
- `variation` is computed conditionally on `currency`
- Price display is conditional on `currency`
- Secondary USD price line removed
- `DollarFooter` always rendered; passes `undefined` when not ready (component defaults to `{}`)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/screens/WatchlistScreen.tsx
git commit -m "feat: restructure WatchlistScreen header with ARS/USD switch and inline + button"
```

---

## Chunk 3: AssetDetailScreen

### Task 4: Apply currency switch to AssetDetailScreen

**Files:**
- Modify: `src/screens/AssetDetailScreen.tsx`

- [ ] **Step 1: Read `src/screens/AssetDetailScreen.tsx`**

Note the current structure: big ARS price, smaller USD price, 4-period variation grid using `current.ars` and `hist.ars`.

- [ ] **Step 2: Rewrite `AssetDetailScreen.tsx`**

Replace the entire file with:

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { usePreferencesStore } from '../stores/preferencesStore'
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
  const { currency } = usePreferencesStore()

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
            <p className="text-3xl font-bold">
              {currency === 'ars'
                ? `$${current.ars.toLocaleString('es-AR')}`
                : `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}`}
            </p>
          ) : (
            <p className="text-gray-500">Sin datos disponibles</p>
          )}
        </div>

        {/* Variation grid */}
        {current && (
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(PERIOD_LABELS) as [VariationPeriod, string][]).map(([period, label]) => {
              const hist = allHistory[period][symbol]
              const variation = hist
                ? currency === 'ars'
                  ? calcVariation(current.ars, hist.ars ?? undefined)
                  : calcVariation(current.usd, hist.usd ?? undefined)
                : null
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

Key changes from original:
- Imports `usePreferencesStore` and reads `currency`
- Price block shows only the selected currency (no secondary line)
- Variation grid: all four cells use `currency` to pick `ars` or `usd` path

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/screens/AssetDetailScreen.tsx
git commit -m "feat: apply ARS/USD currency switch to AssetDetailScreen"
```

---

## Final verification

- [ ] **Start dev server and smoke-test**

Run: `npm run dev`

Check:
1. WatchlistScreen header shows period pills + blue `+` button in row 1
2. Row 2 shows `ARS $` / `USD u$s` segmented switch, `ARS $` active by default
3. DollarFooter visible at bottom even during loading (shows `—`)
4. Fixed FAB (bottom-right) is gone
5. Switching to USD: ticker prices update to USD format, variation badges recompute
6. Tapping a ticker: AssetDetailScreen shows only the selected-currency price, all 4 variation cells update
7. Navigating back and switching currency: behavior consistent
8. List scrolls without footer moving

- [ ] **Final commit if needed**

```bash
git add -A
git commit -m "chore: verify frontend improvements complete"
```
