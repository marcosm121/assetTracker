# Frontend Improvements — Design Spec

**Date:** 2026-03-16

## Overview

Three UI improvements to `WatchlistScreen` and `AssetDetailScreen`:

1. Footer (`DollarFooter`) always visible
2. Add-ticker button (`+`) moved to the header
3. ARS/USD currency switch in the header, affecting price display on both screens

---

## 1. Header Restructure (WatchlistScreen)

The sticky header changes from a single row to two rows:

**Row 1:** `Mi Watchlist` (left) · `[1D] [1S] [1M] [3M] [+]` (right)

- The `+` button is a small circular blue button placed inline to the right of the period pills
- Replaces the current `position: fixed` FAB at `bottom-20 right-6`

**Row 2:** ARS/USD segmented switch, centered

- Two segments: `ARS $` and `USD u$s`
- Always initializes to `ARS`; no localStorage persistence
- Tapping a segment updates `currency` in `preferencesStore`

---

## 2. Footer Always Visible

`DollarFooter` currently renders conditionally (`adapter.isReady()`). It will now render always.

- Props `rates` and `historyRates` become optional (default to empty object `{}`). When values are `null` or `undefined`, the component already renders `—` — no logic change needed there.
- The outer `WatchlistScreen` layout stays `flex flex-col`. The content `div` (currently `flex-1 divide-y`) gains `overflow-y-auto` so the ticker list scrolls independently while the footer stays anchored at the bottom of the viewport.
- No `position: fixed` needed — the flex column keeps the footer pinned naturally.

---

## 3. Currency State

### Store

Add `currency: 'ars' | 'usd'` to `preferencesStore`:

```ts
currency: 'ars' as 'ars' | 'usd',
setCurrency: (c: 'ars' | 'usd') => set({ currency: c }),
```

- Initialized to `'ars'` on every app load
- **Not** written to `localStorage` — intentionally ephemeral

### WatchlistScreen rows

Each ticker row shows:

- **Price:** `$1.234.567` (ARS) or `u$s 1234.5600` (USD) depending on `currency`
- **Variation badge:** computed from the selected currency's price (`current.ars` / `hist.ars` or `current.usd` / `hist.usd`)
- The secondary price line (previously showing the other currency) is removed entirely

### AssetDetailScreen

- Reads `currency` from `preferencesStore`
- The per-period grid shows values in the selected currency (ARS price + ARS variation, or USD price + USD variation)

---

## Affected Files

| File | Change |
|---|---|
| `src/stores/preferencesStore.ts` | Add `currency` / `setCurrency` (no localStorage) |
| `src/screens/WatchlistScreen.tsx` | Two-row header, remove FAB, ARS/USD row logic, DollarFooter always rendered, content area `overflow-y-auto` |
| `src/components/DollarFooter.tsx` | Make `rates` / `historyRates` props optional |
| `src/screens/AssetDetailScreen.tsx` | Read `currency` from store, display selected currency values |

---

## Out of Scope

- No changes to `AddTickerScreen`
- No changes to routing
- No changes to backend adapter or data fetching
- No persistence of the ARS/USD preference
