# UI Redesign — Design Spec

**Date:** 2026-03-19
**Status:** Approved for implementation

---

## Overview

Full visual redesign of the assetTracker app, migrating from a dark theme to a light theme and restructuring navigation from a single-page flow to a 3-tab bottom nav bar. Reference design is a modern fintech watchlist app (light cards on gray background, avatar initials, bottom nav).

---

## 1. Theme & Visual Language

- **Background:** `slate-100` (`#f1f5f9`) — page background
- **Cards:** `white` with `rounded-xl`, subtle shadow (`shadow-sm`)
- **Text primary:** `slate-900` (`#0f172a`)
- **Text secondary:** `slate-400` (`#94a3b8`)
- **Accent / active:** `slate-800` (`#1e293b`) for selected pills and toggle
- **Positive variation:** `green-600` (`#16a34a`) with `↗` arrow
- **Negative variation:** `red-600` (`#dc2626`) with `↘` arrow
- **Avatar background:** `#dde3f5` (light indigo-blue), letter in `#4a5fa0`
- **Borders:** `slate-200` (`#e2e8f0`)

### VariationBadge

Replace current `▲`/`▼` arrows with diagonal `↗`/`↘`. Update color classes from `text-green-400`/`text-red-400` to `text-green-600`/`text-red-600` to maintain legibility on the new light background. No other changes to the component's behavior.

---

## 2. Navigation — Bottom Nav Bar

A persistent bottom nav replaces the current DollarFooter and the single-screen layout. Three tabs:

| Tab | Icon | Screen |
|---|---|---|
| Watchlist | ★ star | `WatchlistScreen` |
| Dólares | $ | `DolaresScreen` (new) |
| Noticias | 📰 | `NoticiasScreen` (new, placeholder) |

- Active tab: icon + label in `slate-800`, bold
- Inactive tabs: icon + label in `slate-400`
- Background: `white`, top border `slate-200`
- The bottom nav is rendered in the root `App` component and persists across all screens. `AssetDetailScreen` and `AddTickerScreen` are modal-style overlays that sit above the nav (full-screen, no tab highlighting changes).

---

## 3. Company Name Mapping

A static record `COMPANY_NAMES: Record<string, string>` is added to a new file `src/utils/companyNames.ts`. It maps common Argentine ticker symbols to their display names.

Initial entries (non-exhaustive, expandable):

```
GGAL → Grupo Financiero Galicia
YPFD → YPF S.A.
BMA  → Banco Macro
BBAR → BBVA Argentina
PAMP → Pampa Energía
TECO2 → Telecom Argentina
ALUA → Aluar Aluminio
TXAR → Ternium Argentina
SUPV → Grupo Supervielle
CEPU → Central Puerto
CRES → Cresud
LOMA → Loma Negra
MIRG → Mirgor
VALO → Grupo Financiero Valores
```

If a symbol has no entry, the name renders as an empty string (no second line shown). This leaves the layout slot available for when the backend provides names.

---

## 4. WatchlistScreen

### Header (sticky)

Two rows:

**Row 1:** `"Mi Watchlist"` (bold, `slate-900`) on the left. ARS/USD segmented toggle on the right (pill shape, `slate-100` background, active side `slate-800` + white text). The toggle reads and writes the `currency` field (`'ars' | 'usd'`) from `preferencesStore` — the same store used today — so the selected currency persists across screens and tab switches within a session. No `localStorage` persistence is required; in-memory Zustand state is sufficient.

**Row 2 (period pills):** `1D | 1S | 1M | 3M` as horizontal pill buttons. Selected pill: `slate-800` bg + white text, rounded-full. Unselected: no background, `slate-400` text. Botón `+` (circle, `blue-500`) at the far right of this row.

### List

`flex-col gap-3 p-3` container. Each item is a `white rounded-xl shadow-sm` card:

```
[Avatar] [Symbol bold / Company name slate-400]    [Price bold / Variation ↗↘]
```

- **Avatar:** 36×36px, `rounded-lg`, `#dde3f5` bg, first letter of symbol in `#4a5fa0` bold
- **Symbol:** `font-bold text-slate-900`
- **Company name:** `text-xs text-slate-400` (empty string → no second line rendered)
- **Price:** right-aligned, `font-bold text-slate-900 text-sm`
- **Variation:** `VariationBadge` (updated arrows)

Loading state: skeleton pulse placeholder on price/variation. Empty state and error state keep current copy, adapted to light theme.

---

## 5. AssetDetailScreen

### Header (sticky)

Left: back arrow (`←`) + symbol name bold. Right: same ARS/USD segmented toggle as WatchlistScreen.

### Hero section

```
SYMBOL (large bold, slate-900)
Company name (slate-400, or omitted if no mapping)
$PRICE (very large bold, slate-900)
[↗ +X.XX%  Period label pill]   ← variation for currently selected global period
```

The variation pill in the hero uses the **globally selected period** from `preferencesStore`. Pill has a colored background: `green-50`/`red-50` with matching text.

Period label mapping for hero pill:
- `1d` → "Hoy"
- `1w` → "Esta semana"
- `1m` → "Este mes"
- `3m` → "Últimos 3 meses"

### Historial section

A `white rounded-xl shadow-sm` card with a `"Historial"` heading. Inside: a list of all 4 periods, each row:

```
[Period avatar]  [Period label]          [Historical price bold]
                                         [Variation % colored]
```

- **Period avatar:** 28×28px `rounded-md`, `#dde3f5` bg, period code (`1D`/`1S`/`1M`/`3M`) in `#4a5fa0` bold `text-xs`
- **Period label (Spanish):** `1d` → "Diario", `1w` → "Semanal", `1m` → "Mensual", `3m` → "Trimestral"
- **Historical price:** formatted same as current price (ARS or USD per toggle)
- **Variation %:** colored text with `↗`/`↘`, no background

If historical price is null for a period: show `—` for both price and variation.

---

## 6. DolaresScreen (new)

New screen, rendered when Dólares tab is active.

### Header (sticky)

`"Dólares"` title on the left. Period pills row below (same `1D | 1S | 1M | 3M` style) — uses the **same global `variationPeriod`** from `preferencesStore`.

No ARS/USD toggle (dollar rates are always in ARS pesos).

### Content

`flex-col gap-3 p-3`. One `white rounded-xl shadow-sm` card per dollar rate:

```
Oficial                    $1.065
                           ↗ +0.28%
```

Four cards: Oficial, Blue, Bolsa, CCL.

Data comes from `adapter.getDollarRates()` and `adapter.getHistoryDollarRates(variationPeriod)` — same calls as the current DollarFooter, no adapter changes needed.

Loading/error states: same as WatchlistScreen (data is already cached from initial `fetchAll()`).

---

## 7. NoticiasScreen (new, placeholder)

Simple full-screen placeholder:

```
📰
Noticias
Próximamente
```

Centered vertically. No functionality. Tab is tappable and navigates to this screen.

---

## 8. Navigation Architecture

`App.tsx` currently uses `react-router-dom`. The routing changes:

- `/` → WatchlistScreen (Watchlist tab active)
- `/dolares` → DolaresScreen (Dólares tab active)
- `/noticias` → NoticiasScreen (Noticias tab active)
- `/asset/:symbol` → AssetDetailScreen (full screen, Watchlist tab stays active)
- `/add` → AddTickerScreen (full screen, Watchlist tab stays active)

A new `BottomNav` component reads the current route to highlight the active tab and calls `navigate()` on tap. It is rendered in the root layout, not inside individual screens.

The current `DollarFooter` component is **removed** (replaced by DolaresScreen).

---

## 9. AddTickerScreen

No structural changes. Visual update only: adapt to light theme (white background, `slate-100` inputs, same form/list structure).

---

## 10. Files Affected

| File | Change |
|---|---|
| `src/components/VariationBadge.tsx` | Update arrows `▲▼` → `↗↘` |
| `src/components/DollarFooter.tsx` | **Delete** |
| `src/components/BottomNav.tsx` | **New** |
| `src/utils/companyNames.ts` | **New** |
| `src/screens/WatchlistScreen.tsx` | Full visual rewrite |
| `src/screens/AssetDetailScreen.tsx` | Full visual rewrite |
| `src/screens/AddTickerScreen.tsx` | Light theme adaptation |
| `src/screens/DolaresScreen.tsx` | **New** |
| `src/screens/NoticiasScreen.tsx` | **New** (placeholder) |
| `src/App.tsx` | Add routes, render `BottomNav`, remove DollarFooter |
| `src/index.css` | Set `body` background to `slate-100` |

---

## Out of Scope

- News/articles data fetching (NoticiasScreen is placeholder only)
- Backend company name support
- Charts or price history graphs
- Favorites/star functionality
- Any changes to the adapter, stores, or data layer
