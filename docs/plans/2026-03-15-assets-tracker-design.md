# Assets Tracker — Design Document

**Date:** 2026-03-15

## Overview

Personal web app (PWA) to track a custom watchlist of financial assets using the InvertirOnLine (IoL) API. Each user brings their own IoL credentials — no backend, no shared auth, no hosting costs beyond a static deploy.

---

## Architecture

### High-Level

```
[React PWA (browser / installed on mobile)]
        │
        ▼
[MarketDataProvider interface]
        │
        ▼
[IoLAdapter]  ← only class aware of IoL specifics
        │
        ▼
[api.invertironline.com]
```

The `IoLAdapter` is the only module that knows about IoL endpoints, token management, and request format. Replacing IoL with another provider = write a new adapter implementing `MarketDataProvider`. Nothing else changes.

### MarketDataProvider Interface

```ts
interface MarketDataProvider {
  getQuote(symbol: string, market: string): Promise<Quote>
  getHistory(symbol: string, market: string, from: Date, to: Date): Promise<HistoryPoint[]>
  searchSymbol(query: string): Promise<SymbolResult[]>
}
```

### Stack

| Layer | Choice |
|---|---|
| Framework | React + Vite |
| Styling | TailwindCSS |
| Charts | Lightweight Charts (TradingView) |
| Global state | Zustand |
| Persistence | localStorage |
| Deploy | Netlify or Vercel (free tier) |
| CORS fallback | Cloudflare Worker (if needed) |

---

## Screens

### 1. Login
- First visit only
- User enters IoL username + password
- `IoLAdapter` exchanges credentials for bearer + refresh tokens
- Tokens stored in `localStorage` with `expires_at`
- Redirects to Watchlist on success

### 2. Watchlist (Home)
```
┌──────────────────────────────┐
│  Variación: [ vs día ant. ▼] │  ← global dropdown, persisted
│  ──────────────────────────  │
│  GGAL  Galicia               │
│  $1.240          +3,2%  ▲   │
│  ──────────────────────────  │
│  PAMP  Pampa Energía         │
│  $890            -1,1%  ▼   │
│                          [+] │
└──────────────────────────────┘
```

- Dropdown options: `vs día ant.` | `vs LW` | `vs LM` | `vs L3M` | `vs LY`
- Variation calculated as: `(current_price - reference_price) / reference_price * 100`
- Reference price comes from the historical series endpoint (reused, no extra calls)
- Tap on asset → Asset Detail

### 3. Asset Detail
- Symbol name + current price
- Period tabs: `1S` | `1M` | `3M` | `1A`
- Line chart with historical prices (Lightweight Charts)

---

## Data / Persistence

All data lives in `localStorage` — no backend, no database.

```ts
// localStorage schema
{
  auth: {
    access_token: string,
    refresh_token: string,
    expires_at: number  // unix ms
  },
  watchlist: [
    { symbol: string, market: string, label: string }
  ],
  preferences: {
    variationPeriod: "1d" | "1w" | "1m" | "3m" | "1y"
  }
}
```

---

## IoL API Endpoints Used

| Purpose | Endpoint |
|---|---|
| Auth | `POST /token` |
| Token refresh | `POST /token` (grant_type=refresh_token) |
| Current quote | `GET /api/v2/{mercado}/Titulos/{simbolo}/Cotizacion` |
| Historical series | `GET /api/v2/{mercado}/Titulos/{simbolo}/Cotizacion/seriehistorica/{desde}/{hasta}/{ajustada}` |
| Symbol search | `GET /api/v2/Cotizaciones/{Instrumento}/{Pais}/Todos` |

---

## Token Management

- Before each request: check `expires_at`
- If < 2 minutes remaining: refresh token first
- If refresh fails: clear auth from localStorage, redirect to Login

---

## CORS Strategy

1. Attempt direct browser → IoL API calls
2. If blocked by CORS: add a Cloudflare Worker (~10 lines) as a transparent proxy
3. `IoLAdapter` only changes its base URL — no other code changes

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Symbol not found | Inline message in search |
| Token expired / refresh failed | Silent redirect to Login |
| API unavailable | Skeleton loaders + non-intrusive error message |

---

## Out of Scope (v1)

- Portfolio sync (no `/portafolio` endpoint)
- Order placement
- Push notifications / price alerts
- Offline mode / service worker caching
- Multi-user / shared backend
