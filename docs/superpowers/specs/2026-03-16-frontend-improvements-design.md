# Frontend Improvements — Design Spec

**Date:** 2026-03-16

## Overview

Three UI improvements to `WatchlistScreen` and `AssetDetailScreen`:

1. Footer (`DollarFooter`) always visible
2. Add-ticker button (`+`) moved to the header
3. ARS/USD currency switch in the header, affecting price display on both screens

---

## 1. Header Restructure (WatchlistScreen)

The current header is a single `flex items-center justify-between` row. It becomes a `flex flex-col` container with two inner rows:

**Row 1** (`flex items-center justify-between`): `Mi Watchlist` (left) · period pills + `+` button (right, same `flex gap-1` group)

- The period pills (`[1D][1S][1M][3M]`) remain in the header; `variationPeriod` continues to drive both the watchlist row variations and `adapter.getHistoryDollarRates(variationPeriod)` in the footer — no change to this logic
- The `+` button is `w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg`
- Replaces the current `position: fixed` FAB at `bottom-20 right-6`; that button is removed entirely

**Row 2** (`flex justify-center`): ARS/USD segmented switch

- Two segments: `ARS $` and `USD u$s`
- Active segment: filled blue pill; inactive: gray text
- Tapping a segment calls `setCurrency` from `preferencesStore`
- Always starts as `'ars'` — see Section 3

---

## 2. Footer Always Visible

`DollarFooter` currently renders conditionally (`adapter.isReady()`). It will now render always.

### Prop type change

Update the `Props` interface to make both props optional:

```ts
interface Props {
  rates?: Partial<DollarRates>
  historyRates?: Partial<DollarRates>
}
```

Default both to `{}` in the function signature: `{ rates = {}, historyRates = {} }`.

### Null/undefined fix inside LABELS.map

With `Partial<DollarRates>`, reading a key can yield `undefined` (in addition to the existing `number | null`). Replace the two reads at the top of the `LABELS.map` callback:

```ts
// before
const current = rates[key]
const reference = historyRates[key]

// after — same variable names, normalized types
const current = rates[key] ?? null           // number | null — existing !== null check shows —
const reference = historyRates[key] ?? undefined  // number | undefined — safe for calcVariation
```

The `calcVariation(current, reference ?? undefined)` call that follows becomes `calcVariation(current, reference)` since `reference` is already `number | undefined` — or leave the `?? undefined` in place; it is harmless either way.

### Layout

The outer `WatchlistScreen` layout stays `flex flex-col min-h-screen`. The content `div` (currently `flex-1 divide-y`) gains `overflow-y-auto` so the ticker list scrolls independently while the footer stays anchored at the bottom. No `position: fixed` needed.

The `DollarFooter` is rendered unconditionally (no `adapter.isReady()` guard). It displays `—` for all dollar values while data is loading. The `WatchlistScreen` call site continues to pass `adapter.getDollarRates()` and `adapter.getHistoryDollarRates(variationPeriod)` unchanged — these return full `DollarRates` objects which are compatible with `Partial<DollarRates>` props. Only the default `{}` case (before data loads) triggers the undefined-normalization path.

---

## 3. Currency State

### Store — `preferencesStore.ts`

Update both the `PreferencesState` interface and the `create(...)` initializer:

```ts
interface PreferencesState {
  variationPeriod: VariationPeriod
  setVariationPeriod: (period: VariationPeriod) => void
  currency: 'ars' | 'usd'
  setCurrency: (c: 'ars' | 'usd') => void
}
```

Add to the store:

```ts
currency: 'ars' as 'ars' | 'usd',
setCurrency: (c) => set({ currency: c }),
```

- The initial value is hardcoded to `'ars'` in the Zustand initializer — **not** derived from `loadPreferences()`
- `currency` is **not** wired to `savePreferences` or `loadPreferences`
- `storage.ts`, `Preferences` type, `savePreferences`, and `loadPreferences` are **not modified**
- Every app load starts with `currency === 'ars'`

### WatchlistScreen rows

Each ticker row shows **one** price and **one** variation badge. The existing `variation` constant must be computed conditionally based on `currency`:

```ts
const variation = current && hist
  ? currency === 'ars'
    ? calcVariation(current.ars, hist.ars ?? undefined)
    : calcVariation(current.usd, hist.usd ?? undefined)
  : null
```

Rendered price (loaded state):

- **ARS mode:** `$${current.ars.toLocaleString('es-AR')}`
- **USD mode:** `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}`

The secondary price line (the smaller line showing the other currency) is removed entirely from the loaded state. The loading skeleton (single `w-20 animate-pulse` bar) is unchanged — there was already only one skeleton bar and there is now only one price line, so no structural change.

### AssetDetailScreen

The screen currently shows a big ARS price, a smaller USD price below it, and a 4-period variation grid (1D, 1S, 1M, 3M). `variationPeriod` from the store is not used here — the screen always shows all four periods.

Changes:

- **ARS mode:** show `$${current.ars.toLocaleString('es-AR')}` as the large price; hide the USD line
- **USD mode:** show `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}` as the large price; hide the ARS line
- If `current` is missing (existing `!current` guard), behavior is unchanged — renders "Sin datos disponibles"
- **Variation grid:** all four cells switch currency simultaneously using the same conditional pattern as WatchlistScreen rows. Each cell continues to show only a period label + `VariationBadge` (no absolute price per cell)

---

## Affected Files

| File | Change |
|---|---|
| `src/stores/preferencesStore.ts` | Add `currency`/`setCurrency` to interface and store (no storage wiring) |
| `src/screens/WatchlistScreen.tsx` | Two-row header (`flex-col`), inline `+` button, remove FAB, add `currency`/`setCurrency` to `usePreferencesStore()` destructure, conditional variation + price by currency, DollarFooter always rendered, content `overflow-y-auto` |
| `src/components/DollarFooter.tsx` | Props → `Partial<DollarRates>` optional; normalize `current` and `reference` reads in `LABELS.map` |
| `src/screens/AssetDetailScreen.tsx` | Read `currency` from store; show only selected-currency price; all four variation cells use selected-currency history |

---

## Out of Scope

- No changes to `AddTickerScreen`
- No changes to routing
- No changes to backend adapter or data fetching
- No changes to `storage.ts`, `Preferences` type, `savePreferences`, or `loadPreferences`
- No persistence of the ARS/USD preference
