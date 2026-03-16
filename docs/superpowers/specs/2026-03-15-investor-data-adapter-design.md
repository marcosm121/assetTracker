# Design: InvestorData Adapter Migration

**Date:** 2026-03-15
**Status:** Approved

## Goal

Replace the IoL API integration with a local `investorData` backend. The new backend serves all prices in a single batch request, manages the ticker list server-side, and has no authentication. The app simplifies accordingly: no login screen, no per-ticker requests, no historical chart.

---

## Backend API (investorData)

Base URL: configurable via `VITE_INVESTOR_DATA_URL` (default `http://localhost:3000`)

| Endpoint | Description |
|---|---|
| `GET /many` | Current prices for all tickers + dollar rates |
| `GET /manyhistory/:date` | Prices for a specific date (YYYY-MM-DD), `null` where no snapshot exists |
| `POST /add` | Add a ticker to the backend list |
| `POST /remove` | Remove a ticker from the backend list |

`GET /many` response shape:
```json
{
  "GGAL": 1234.56,
  "YPF": 8900.00,
  "oficial": 1180.50,
  "blue": 1350.00,
  "bolsa": 1290.75,
  "contadoconliqui": 1310.25
}
```

Dollar keys are always the last four: `oficial`, `blue`, `bolsa`, `contadoconliqui`.

---

## Architecture

### Adapter: `InvestorDataAdapter`

Replaces `IoLAdapter`. Implements a new `DataProvider` interface. On `fetchAll()` it fires 5 requests in parallel and stores the results in memory:

1. `GET /many` → current prices
2. `GET /manyhistory/:yesterday` → reference prices for 1d variation
3. `GET /manyhistory/:7daysago` → reference prices for 1w variation
4. `GET /manyhistory/:30daysago` → reference prices for 1m variation
5. `GET /manyhistory/:90daysago` → reference prices for 3m variation

All subsequent reads are from cache — no additional requests until `fetchAll()` is called again (on ticker add/remove or manual refresh).

### New `DataProvider` interface (`src/adapters/types.ts`)

```ts
export type PriceMap = Record<string, number | null>
export type VariationPeriod = '1d' | '1w' | '1m' | '3m'

export interface DataProvider {
  fetchAll(): Promise<void>
  getPrices(): PriceMap
  getHistoryPrices(period: VariationPeriod): PriceMap
  getWatchlist(): string[]
  getDollarRates(): { oficial: number | null; blue: number | null; bolsa: number | null; contadoconliqui: number | null }
  addTicker(symbol: string): Promise<void>
  removeTicker(symbol: string): Promise<void>
  isReady(): boolean
}
```

**`getWatchlist()`** returns the ticker keys from `/many`, excluding the four dollar keys.
**`getDollarRates()`** returns the four dollar values from the current price cache.

### Domain types

`market` is removed everywhere — the backend has no concept of market.

```ts
export interface WatchlistItem {
  symbol: string
  label: string        // same as symbol for now; user-editable label in future
}

export interface Quote {
  symbol: string
  price: number
  timestamp: Date
}
```

`HistoryPoint` and `SymbolResult` are removed (no chart, no symbol search).

---

## Stores

### `authStore` — removed
No authentication. The store and all its references are deleted.

### `watchlistStore` — simplified
Populated from `adapter.getWatchlist()` after `fetchAll()`. localStorage is used only as a fallback for the initial render before the first fetch completes. Add/remove operations call the adapter (which calls the backend) and then re-run `fetchAll()` to refresh.

### `preferencesStore` — unchanged
Stores the selected `VariationPeriod` (`'1d' | '1w' | '1m' | '3m'`).

---

## Screens

### `LoginScreen` — removed
No authentication. App starts directly on the watchlist.

### `WatchlistScreen` — updated
- Calls `adapter.fetchAll()` on mount
- Builds rows from `adapter.getWatchlist()`, `adapter.getPrices()`, and `adapter.getHistoryPrices(period)`
- Variation period selector: 1d / 1w / 1m / 3m (removes 1y)
- **Dollar footer**: fixed at bottom, shows `oficial`, `blue`, `bolsa`, `CCL` as horizontal scrollable chips with current value and variation vs selected period. Styled for mobile (`bg-gray-900`, small text, border-top separator).

### `AssetDetailScreen` — simplified (no chart)
Shows price and variation for **all four periods simultaneously**:

```
GGAL
$1.234,56

  1d      1w      1m      3m
+2.1%   +5.3%   -1.2%   +12.4%
```

No tabs, no requests — all data comes from the in-memory cache.

### `AddTickerScreen` (replaces `SymbolSearchScreen`)
Single text input for the ticker symbol. On submit: calls `adapter.addTicker(symbol)`, then refreshes. Shows error if backend returns 409 (already exists) or 500. Remove action on existing tickers calls `adapter.removeTicker(symbol)`.

---

## Components

### `PriceChart` — removed
No historical chart.

### `VariationBadge` — unchanged
Still used for per-ticker and dollar variation display.

### `DollarFooter` — new
Displays the four dollar rates as a horizontally-scrollable row of chips. Props: `rates` (current dollar values), `history` (reference dollar values for the selected period).

---

## Configuration

```ts
// src/config.ts
export const INVESTOR_DATA_URL = import.meta.env.VITE_INVESTOR_DATA_URL ?? 'http://localhost:3000'
```

`AdapterContext` creates `InvestorDataAdapter(INVESTOR_DATA_URL)` — no auth callback needed.

---

## Routing

```
/           → WatchlistScreen (no auth guard — always accessible)
/asset/:symbol → AssetDetailScreen
/add        → AddTickerScreen
```

`RequireAuth` guard and all auth-related routing logic are removed.

---

## Error Handling

- `fetchAll()` failure → WatchlistScreen shows an inline error with a retry button
- `addTicker()` 409 → "El ticker ya existe"
- `addTicker()` 500 → "No se pudo agregar. Intentá de nuevo."
- `removeTicker()` 404 → "Ticker no encontrado"
- `manyhistory` returning `null` for a symbol → variation shown as `—`

---

## Testing

- `InvestorDataAdapter` unit tests: mock `fetch`, verify `fetchAll` fires 5 parallel requests, verify `getWatchlist` excludes dollar keys, verify `addTicker`/`removeTicker` call correct endpoints and re-fetch
- `calcVariation` tests: unchanged
- `storage` tests: unchanged (auth functions removed from storage)
- `DataProvider` interface type-check test: updated to new interface shape
