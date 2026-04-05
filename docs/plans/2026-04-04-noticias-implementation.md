# Noticias Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the `/noticias` screen consuming `GET /news` from the existing backend, with lazy fetch-once caching in the adapter and a card-list UI with category badges.

**Architecture:** Add `NewsItem` type + two methods to `DataProvider`; implement them in `InvestorDataAdapter` with cache-on-first-fetch; rewrite `NoticiasScreen` with a `loading | error | loaded` state machine.

**Tech Stack:** TypeScript, React, Tailwind CSS, Vitest

---

### Task 1: Add types and extend DataProvider interface

**Files:**
- Modify: `src/adapters/types.ts`

**Step 1: Add NewsCategory and NewsItem types, and two methods to DataProvider**

In `src/adapters/types.ts`, add after the existing `DollarRates` interface:

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

Add to the `DataProvider` interface (after `removeTicker`):

```typescript
  fetchNews(): Promise<void>
  getNews(): NewsItem[]
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: error about `InvestorDataAdapter` not implementing `fetchNews` and `getNews` (that's expected — we haven't implemented them yet).

**Step 3: Commit**

```bash
git add src/adapters/types.ts
git commit -m "feat: add NewsItem types and DataProvider news methods"
```

---

### Task 2: Implement fetchNews and getNews in the adapter (TDD)

**Files:**
- Modify: `src/adapters/InvestorDataAdapter.test.ts`
- Modify: `src/adapters/InvestorDataAdapter.ts`

**Step 1: Write the failing tests**

Add the following `describe` block at the end of the existing test file (`src/adapters/InvestorDataAdapter.test.ts`), inside the top-level `describe('InvestorDataAdapter', ...)`:

```typescript
const NEWS_RESPONSE = [
  {
    title: 'YPF cierra acuerdo con Shell',
    url: 'https://example.com/ypf',
    source: 'Infobae',
    publishedAt: '2026-04-04T13:45:00Z',
    category: 'watchlist',
  },
  {
    title: 'Fed mantiene tasas',
    url: 'https://example.com/fed',
    source: 'Reuters',
    publishedAt: '2026-04-04T11:20:00Z',
    category: 'global',
  },
  {
    title: 'Noticia más reciente',
    url: 'https://example.com/recent',
    source: 'Ambito',
    publishedAt: '2026-04-04T15:00:00Z',
    category: 'argentina',
  },
]

describe('fetchNews / getNews', () => {
  it('returns empty array before fetchNews', () => {
    expect(adapter.getNews()).toEqual([])
  })

  it('fetches GET /news and stores sorted by publishedAt desc', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => NEWS_RESPONSE,
    } as Response)

    await adapter.fetchNews()

    expect(fetch).toHaveBeenCalledWith(`${BASE_URL}/news`)
    const news = adapter.getNews()
    expect(news).toHaveLength(3)
    expect(news[0].publishedAt).toBe('2026-04-04T15:00:00Z')  // most recent first
    expect(news[1].publishedAt).toBe('2026-04-04T13:45:00Z')
    expect(news[2].publishedAt).toBe('2026-04-04T11:20:00Z')
  })

  it('does not re-fetch if news already loaded', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => NEWS_RESPONSE,
    } as Response)

    await adapter.fetchNews()
    await adapter.fetchNews()  // second call — should NOT call fetch again

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('throws and leaves cache empty on network error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    await expect(adapter.fetchNews()).rejects.toThrow('GET /news failed: 500')
    expect(adapter.getNews()).toEqual([])
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/adapters/InvestorDataAdapter.test.ts`

Expected: 4 new tests fail with "fetchNews is not a function" or similar.

**Step 3: Implement fetchNews and getNews in InvestorDataAdapter**

In `src/adapters/InvestorDataAdapter.ts`:

1. Add `NewsItem` to the imports at the top:
```typescript
import type {
  DataProvider,
  TickerPriceMap,
  TickerHistoryMap,
  TickerPrice,
  TickerPriceHistory,
  DollarRates,
  VariationPeriod,
  NewsItem,
} from './types'
```

2. Add the private field inside the class (after `private ready = false`):
```typescript
  private news: NewsItem[] = []
```

3. Add the two methods (after `isReady()`):
```typescript
  async fetchNews(): Promise<void> {
    if (this.news.length > 0) return
    const items = await this.get<NewsItem[]>('/news')
    this.news = items.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
  }

  getNews(): NewsItem[] { return this.news }
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/adapters/InvestorDataAdapter.test.ts`

Expected: all tests pass.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

**Step 6: Commit**

```bash
git add src/adapters/InvestorDataAdapter.ts src/adapters/InvestorDataAdapter.test.ts
git commit -m "feat: implement fetchNews/getNews with lazy cache in adapter"
```

---

### Task 3: Rewrite NoticiasScreen

**Files:**
- Modify: `src/screens/NoticiasScreen.tsx`

No component tests exist in this project (see CLAUDE.md — "There are no React component tests").

**Step 1: Rewrite the screen**

Replace the entire content of `src/screens/NoticiasScreen.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import { useAdapter } from '../AdapterContext'
import type { NewsItem, NewsCategory } from '../adapters/types'

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  argentina: 'Argentina',
  global: 'Global',
  geopolitics: 'Geopolítica',
  watchlist: 'Watchlist',
}

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  argentina: 'bg-blue-100 text-blue-700',
  global: 'bg-green-100 text-green-700',
  geopolitics: 'bg-orange-100 text-orange-700',
  watchlist: 'bg-purple-100 text-purple-700',
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `hace ${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  return `hace ${Math.floor(diffHours / 24)}d`
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 active:bg-slate-50"
    >
      <p className="text-sm font-semibold text-slate-900 leading-snug mb-2">
        {item.title}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="text-xs text-slate-400">{item.source}</span>
        <span className="text-xs text-slate-300">·</span>
        <span className="text-xs text-slate-400">{relativeTime(item.publishedAt)}</span>
      </div>
    </a>
  )
}

type ScreenState = 'loading' | 'error' | 'loaded'

export default function NoticiasScreen() {
  const adapter = useAdapter()
  const [state, setState] = useState<ScreenState>(
    adapter.getNews().length > 0 ? 'loaded' : 'loading'
  )

  useEffect(() => {
    if (adapter.getNews().length > 0) return
    adapter.fetchNews()
      .then(() => setState('loaded'))
      .catch(() => setState('error'))
  }, [adapter])

  if (state === 'loading') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-slate-500 text-sm">No se pudieron cargar las noticias.</p>
        <button
          onClick={() => {
            setState('loading')
            adapter.fetchNews()
              .then(() => setState('loaded'))
              .catch(() => setState('error'))
          }}
          className="text-sm text-blue-600 font-medium"
        >
          Reintentar
        </button>
      </div>
    )
  }

  const news = adapter.getNews()

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-24 flex flex-col gap-3">
        <h1 className="text-lg font-bold text-slate-900 mb-1">Noticias</h1>
        {news.map((item, i) => (
          <NewsCard key={i} item={item} />
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Run all tests to verify nothing broke**

Run: `npm test`

Expected: all tests pass.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: no errors.

**Step 4: Commit**

```bash
git add src/screens/NoticiasScreen.tsx
git commit -m "feat: implement NoticiasScreen with news feed and category badges"
```
