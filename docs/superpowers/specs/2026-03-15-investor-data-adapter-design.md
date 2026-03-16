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
| `GET /manyhistory/:date` | Prices for a specific date (YYYY-MM-DD), `null` per key where no snapshot exists |
| `POST /add` | Add a ticker to the backend list |
| `POST /remove` | Remove a ticker from the backend list |

### `GET /many` response

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

The four dollar keys (`oficial`, `blue`, `bolsa`, `contadoconliqui`) are always present in the `/many` response. Ticker values are always `number`. Dollar values are always `number` in `/many`.

### `GET /manyhistory/:date` response

Same shape as `/many` but per-key values are `number | null`. `null` means no snapshot was saved for that symbol on that date. Dollar keys follow the same nullable rule.

```json
{
  "GGAL": 1234.56,
  "YPF": null,
  "oficial": 1180.50,
  "blue": null
}
```

### `POST /add` — body: `{ "symbol": "GGAL" }`

- `201` → success
- `409` → ticker already exists
- `500` → internal error

### `POST /remove` — body: `{ "symbol": "GGAL" }`

- `200` → success
- `404` → ticker not found
- `500` → internal error

---

## Architecture

### Adapter: `InvestorDataAdapter`

Replaces `IoLAdapter`. Implements the `DataProvider` interface. On `fetchAll()` it fires 5 requests in parallel and stores all results in memory:

1. `GET /many` → current prices
2. `GET /manyhistory/:yesterday` → reference prices for 1d variation
3. `GET /manyhistory/:7daysago` → reference prices for 1w variation
4. `GET /manyhistory/:30daysago` → reference prices for 1m variation
5. `GET /manyhistory/:90daysago` → reference prices for 3m variation

All subsequent reads are synchronous from cache. `fetchAll()` is called again after `addTicker`/`removeTicker`. If that secondary `fetchAll()` fails, the adapter retains the previous cache and the screen shows a non-blocking toast error ("No se pudo actualizar la lista").

**Date calculation:** History dates are computed as calendar days in UTC. "Yesterday" = today's UTC date minus 1 day, formatted as `YYYY-MM-DD`. Same logic for 7, 30, and 90 days ago. If the backend has no snapshot for that date (weekend, holiday, or `/manysave` wasn't run), the response will contain `null` values per key — this is valid and variations will display `—`. The adapter does not attempt to fall back to a prior date.

**`addTicker`/`removeTicker` network errors:** If either HTTP request fails at the network level (no response, timeout), the adapter re-throws the error. `AddTickerScreen` catches it and shows "Error de conexión. Verificá tu red." for both operations.

**`addTicker`/`removeTicker` success detection:** Success is determined by `res.ok` (any 2xx status). The exact status code (200 vs 201) is not checked. Any non-2xx response is treated as an error and the adapter throws with the HTTP status code included in the message.

**`isReady()` contract:** Returns `false` until a `fetchAll()` call completes successfully. Stays `false` during Loading and Error states. Becomes `true` after the first successful `fetchAll()` and remains `true` even if a subsequent `fetchAll()` (after add/remove) fails (since the previous cache is still valid).

### New `DataProvider` interface (`src/adapters/types.ts`)

```ts
export type PriceMap = Record<string, number | null>
export type VariationPeriod = '1d' | '1w' | '1m' | '3m'

export interface DollarRates {
  oficial: number | null
  blue: number | null
  bolsa: number | null
  contadoconliqui: number | null
}

export interface DataProvider {
  fetchAll(): Promise<void>
  getPrices(): PriceMap
  getHistoryPrices(period: VariationPeriod): PriceMap
  getAllHistoryPrices(): Record<VariationPeriod, PriceMap>
  getWatchlist(): string[]
  getDollarRates(): DollarRates
  addTicker(symbol: string): Promise<void>
  removeTicker(symbol: string): Promise<void>
  isReady(): boolean
}
```

- **`getWatchlist()`** — returns ticker keys from the `/many` cache, excluding the four dollar keys.
- **`getDollarRates()`** — returns the four dollar values from the current price cache. Values are `number` from `/many` (never null at current price), but typed `number | null` to accommodate the history cache where they may be null.
- **`getAllHistoryPrices()`** — returns all four period maps at once. Used by `AssetDetailScreen` to show all periods simultaneously without calling `getHistoryPrices` four times.
- **`isReady()`** — returns `true` after the first successful `fetchAll()`.

### Domain types

`market` is removed everywhere — the backend has no concept of market.

```ts
export interface WatchlistItem {
  symbol: string
}
```

`Quote`, `HistoryPoint`, `SymbolResult`, and `WatchlistItem.label` are removed (no chart, no symbol search, prices are accessed via `PriceMap` directly).

---

## Stores

### `authStore` — removed
No authentication. The store and all its references are deleted.

### `watchlistStore` — simplified
- On app start, `WatchlistScreen` calls `adapter.fetchAll()` then reads `adapter.getWatchlist()` to populate the list.
- localStorage stores `string[]` (array of symbol strings) as a fallback for the initial render frame before `fetchAll()` completes. Format: `JSON.stringify(["GGAL", "YPF"])` under key `assets_tracker_watchlist`.
- If localStorage contains symbols no longer in the backend response, they are silently dropped when the fetch completes.
- Add/remove: call adapter → re-run `fetchAll()` → update store from `adapter.getWatchlist()`.

### `preferencesStore` — unchanged
Stores the selected `VariationPeriod` (`'1d' | '1w' | '1m' | '3m'`).

---

## Screens

### `LoginScreen` — removed
No authentication. `App.tsx` routing starts at `/` with no auth guard.

### `WatchlistScreen` — updated

**Screen states (mutually exclusive):**

1. **Loading** — `fetchAll()` is in flight. Shows skeleton rows (no error banner). If localStorage has a stale list, skeletons use those symbols; otherwise shows a generic "Cargando..." placeholder.
2. **Error** — `fetchAll()` threw. Shows an inline error banner with a "Reintentar" button. No skeletons.
3. **Loaded** — `fetchAll()` succeeded (`isReady() === true`). Rows show symbol, current price, and `VariationBadge` for the selected period. Period selector shows 1d / 1w / 1m / 3m.

State transitions: Loading → Error (on throw) or Loading → Loaded (on success). "Reintentar" resets to Loading.

**Dollar footer:** Fixed at bottom of screen. Four chips in a horizontal scrollable row: `Oficial`, `Blue`, `Bolsa`, `CCL`. Each chip shows the current dollar value and a `VariationBadge` vs the selected period. Backed by `adapter.getDollarRates()` and `adapter.getHistoryPrices(period)`.

### `AssetDetailScreen` — simplified (no chart)

All data comes from the in-memory cache — no network requests on this screen. Calls `adapter.getAllHistoryPrices()` once to get all four period maps, then renders:

```
GGAL
$1.234,56

  1d      1w      1m      3m
+2.1%   +5.3%   -1.2%   +12.4%
```

Each cell uses `VariationBadge`. If history price is `null` for a period, variation shows `—`.

### `AddTickerScreen` (replaces `SymbolSearchScreen`)

Two sections:

1. **Add form** — single text input (uppercase forced), submit button. Calls `adapter.addTicker(symbol.toUpperCase())`. On success navigates back. On 409 shows "El ticker ya existe". On 500 shows "No se pudo agregar. Intentá de nuevo."

2. **Current tickers list** — lists all tickers from `adapter.getWatchlist()` with a remove button (trash icon) next to each. Tapping remove calls `adapter.removeTicker(symbol)`, then refreshes. On 404 shows "Ticker no encontrado". On 500 shows "No se pudo quitar. Intentá de nuevo."

Route: `/add`

---

## Components

### `PriceChart` — removed
No historical chart.

### `VariationBadge` — unchanged
Used by WatchlistScreen rows, AssetDetailScreen period grid, and DollarFooter chips.

### `DollarFooter` — new

```ts
interface DollarFooterProps {
  rates: DollarRates                              // current prices from adapter.getDollarRates()
  historyRates: DollarRates                       // reference dollar rates for the selected period
}
```

`WatchlistScreen` is responsible for extracting `DollarRates` from `adapter.getHistoryPrices(period)` (a `PriceMap`) and passing it as `historyRates`. Extraction picks the four dollar keys (`oficial`, `blue`, `bolsa`, `contadoconliqui`) from the map. Both an absent key and an explicit `null` value are treated identically as `null` (variation shows `—`).

Renders four chips in a `flex overflow-x-auto` row. Each chip:
- Label: `Oficial` / `Blue` / `Bolsa` / `CCL`
- Current value formatted as `$1.350`
- `VariationBadge` using `calcVariation(current, reference)` — shows `—` if either value is null

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
/              → WatchlistScreen (no auth guard)
/asset/:symbol → AssetDetailScreen
/add           → AddTickerScreen
```

`RequireAuth` guard and all auth-related routing logic are removed.

---

## Error Handling Summary

| Situation | Behavior |
|---|---|
| `fetchAll()` fails on mount | Inline error banner + "Reintentar" button |
| `fetchAll()` fails after add/remove | Non-blocking toast, previous cache retained |
| `addTicker()` 409 | "El ticker ya existe" inline in AddTickerScreen |
| `addTicker()` 500 | "No se pudo agregar. Intentá de nuevo." |
| `removeTicker()` 404 | "Ticker no encontrado" inline in AddTickerScreen |
| `removeTicker()` 500 | "No se pudo quitar. Intentá de nuevo." |
| `removeTicker()` network error | "Error de conexión. Verificá tu red." |
| `manyhistory` null for a symbol | Variation shows `—` via `VariationBadge` |

---

## Testing

- `InvestorDataAdapter` unit tests: mock `fetch`, verify:
  - `fetchAll()` fires exactly 5 parallel requests to correct URLs
  - `getWatchlist()` excludes the four dollar keys
  - `getPrices()` and `getHistoryPrices(period)` return cached values after `fetchAll()`
  - `getAllHistoryPrices()` returns all four period maps
  - `addTicker(symbol)` calls `POST /add` with `{ symbol }` body, then calls `fetchAll()`
  - `removeTicker(symbol)` calls `POST /remove` with `{ symbol }` body, then calls `fetchAll()`
  - `isReady()` returns false before `fetchAll()` and true after
- `calcVariation` tests: unchanged
- `storage` tests: auth functions removed, watchlist format updated to `string[]`
- `DataProvider` interface type-check test: updated to new interface shape
