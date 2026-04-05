# Noticias Screen Design

**Date:** 2026-04-04

## Summary

Implement the market news screen (`/noticias`) by consuming a new `GET /news` endpoint on the existing `investorData` backend. News items are fetched lazily on first visit and cached in the adapter.

## API Contract

**Endpoint:** `GET /news`

**Response:**
```json
[
  {
    "title": "string",
    "url": "string",
    "source": "string",
    "publishedAt": "2026-04-04T13:45:00Z",
    "category": "watchlist | global | argentina | geopolitics"
  }
]
```

## Types (`src/adapters/types.ts`)

```typescript
export type NewsCategory = 'global' | 'argentina' | 'geopolitics' | 'watchlist'

export interface NewsItem {
  title: string
  url: string
  source: string
  publishedAt: string   // ISO 8601
  category: NewsCategory
}
```

Two new methods added to `DataProvider`:
```typescript
fetchNews(): Promise<void>
getNews(): NewsItem[]
```

## Adapter (`InvestorDataAdapter`)

- New private field: `private news: NewsItem[] = []`
- `fetchNews()`: if `this.news.length > 0`, return early (cache hit). Otherwise fetch `GET /news`, sort by `publishedAt` descending, store in `this.news`.
- `getNews()`: returns `this.news` synchronously.
- `fetchNews()` is **not** included in `fetchAll()` — called lazily from the screen.

## NoticiasScreen

**State machine:** `loading | error | loaded` (same pattern as `WatchlistScreen`)

On mount: if `adapter.getNews().length === 0`, call `adapter.fetchNews()` and set state accordingly. Otherwise go straight to `loaded`.

**Layout:**
- Scrollable list of news cards sorted by date (newest first)
- Each card:
  - Title (primary text)
  - Bottom row: category badge + source + relative time (e.g. "hace 2h")
  - On tap: `window.open(url, '_blank')` to open in external browser
- Loading state: spinner
- Error state: message + retry button

**Category badge colors:**
| Category | Color |
|---|---|
| `argentina` | blue |
| `global` | green |
| `geopolitics` | orange |
| `watchlist` | purple |

## Out of Scope

- Category filtering (all shown in one list)
- Pagination
- In-app webview/modal for articles
- Pull-to-refresh
