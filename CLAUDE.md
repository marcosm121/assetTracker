# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (Vite, hot reload)
npm run build        # tsc -b && vite build
npm test             # vitest run (all tests, no watch)
npm run lint         # eslint

# Run a single test file
npx vitest run src/adapters/InvestorDataAdapter.test.ts

# Type-check without building
npx tsc --noEmit
```

The active implementation branch is `feat/initial-implementation`. The worktree lives at `.worktrees/feat-initial-implementation/`.

## Architecture

### Backend dependency

The app requires the **investorData** backend (default `http://localhost:3000`). Configure via `VITE_INVESTOR_DATA_URL`. The backend endpoints used:

| Endpoint | Purpose |
|---|---|
| `GET /manyall` | Current prices (ARS + USD) for all tickers + dollar rates |
| `GET /manyhistory/:date` | Historical prices for a given `YYYY-MM-DD` date (same shape, nullable) |
| `POST /add` | Add a ticker to the backend's watchlist |
| `POST /remove` | Remove a ticker from the backend's watchlist |

The `/manyall` response mixes ticker objects `{ ars, usd }` and flat dollar-rate numbers under the same keys (`oficial`, `blue`, `bolsa`, `contadoconliqui`). The adapter separates them using `DOLLAR_KEYS`.

### Data flow

`main.tsx` wraps the app in `<AdapterProvider>`, which creates a single `InvestorDataAdapter` instance and exposes it via `useAdapter()`.

On mount, `WatchlistScreen` calls `adapter.fetchAll()`, which fires **5 parallel requests**: `/manyall` + 4 × `/manyhistory/:date` (1d, 7d, 30d, 90d ago in UTC). All results are stored in the adapter's in-memory cache. Every subsequent read (`getPrices()`, `getHistoryPrices()`, etc.) is synchronous from that cache — **no screen makes its own network request**.

After `addTicker` / `removeTicker` succeed (POST), `fetchAll()` is called again to refresh the cache. If that secondary fetch fails, the error is swallowed and the previous cache is retained.

### Key interfaces (`src/adapters/types.ts`)

- `DataProvider` — the interface `InvestorDataAdapter` implements. Screens depend only on this interface.
- `VariationPeriod` — `'1d' | '1w' | '1m' | '3m'`
- `TickerPrice` — `{ ars: number; usd: number }` (current)
- `TickerPriceHistory` — `{ ars: number | null; usd: number | null }` (historical, null = no snapshot)
- `DollarRates` — `{ oficial, blue, bolsa, contadoconliqui }` all `number | null`

### Zustand stores

- `watchlistStore` — `items: string[]` (ticker symbols). Populated from `adapter.getWatchlist()` after `fetchAll()`. Also persisted to `localStorage` as a stale fallback for the loading frame.
- `preferencesStore` — `variationPeriod: VariationPeriod`. Persisted to `localStorage`.

Stores are thin reactive caches. The adapter owns all mutations to the backend; stores just mirror the result.

### Screens

- `/` → `WatchlistScreen` — 3-state machine (`loading | error | loaded`). Shows symbol, ARS price, USD price, `VariationBadge` per row. Fixed `DollarFooter` at bottom.
- `/asset/:symbol` → `AssetDetailScreen` — reads from cache only (no fetch). Shows current ARS/USD + 4-period variation grid.
- `/add` → `AddTickerScreen` — add form + current ticker list with remove buttons. All error messages per spec.

### Testing approach

Tests mock `fetch` with `vi.stubGlobal('fetch', vi.fn())`. The adapter test verifies call count, URL patterns, response parsing, and error propagation. Storage tests use `localStorage.clear()` in `beforeEach`. There are no React component tests — only adapter, storage, and utility unit tests.

### TypeScript note

The project uses `erasableSyntaxOnly`. Avoid TypeScript constructor parameter properties (`constructor(private readonly x: T)`); use explicit property declarations instead.
