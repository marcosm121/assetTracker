# Noticia Detail Screen Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a detail screen at `/noticias/:index` that shows the news summary in markdown before letting the user open the full article externally.

**Architecture:** Add optional `summary` field to `NewsItem`; extract shared display utilities (`relativeTime`, `CATEGORY_LABELS`, `CATEGORY_COLORS`) to `src/utils/newsDisplay.ts`; update `NoticiasScreen` to navigate instead of opening URL; create `NoticiaDetailScreen` using `react-markdown`; register the new route in `App.tsx`.

**Tech Stack:** TypeScript, React, React Router, Tailwind CSS, react-markdown, Vitest

---

### Task 1: Add `summary` field to `NewsItem` and update adapter test data

**Files:**
- Modify: `src/adapters/types.ts`
- Modify: `src/adapters/InvestorDataAdapter.test.ts`

**Step 1: Add `summary` to NewsItem**

In `src/adapters/types.ts`, update `NewsItem` to:

```typescript
export interface NewsItem {
  title: string
  url: string
  source: string
  publishedAt: string   // ISO 8601
  category: NewsCategory
  summary?: string      // markdown, optional
}
```

**Step 2: Add `summary` to one test fixture and assert it's preserved**

In `src/adapters/InvestorDataAdapter.test.ts`, update the first item in `NEWS_RESPONSE` to include a summary:

```typescript
const NEWS_RESPONSE = [
  {
    title: 'YPF cierra acuerdo con Shell',
    url: 'https://example.com/ypf',
    source: 'Infobae',
    publishedAt: '2026-04-04T13:45:00Z',
    category: 'watchlist',
    summary: '### Resumen\nYPF cerró un acuerdo importante.',
  },
  // ... rest unchanged
]
```

Then in the test `'fetches GET /news and stores sorted by publishedAt desc'`, add an assertion after the sort-order checks:

```typescript
expect(news[1].summary).toBe('### Resumen\nYPF cerró un acuerdo importante.')
```

(After sorting, the YPF item is at index 1.)

**Step 3: Run tests to verify they still pass**

Run: `npx vitest run src/adapters/InvestorDataAdapter.test.ts`

Expected: all 30 tests pass.

**Step 4: TypeScript check**

Run: `npx tsc -p tsconfig.app.json --noEmit`

Expected: no errors.

**Step 5: Commit**

```bash
git add src/adapters/types.ts src/adapters/InvestorDataAdapter.test.ts
git commit -m "$(cat <<'EOF'
feat: add optional summary field to NewsItem

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Extract shared news display utilities

**Files:**
- Create: `src/utils/newsDisplay.ts`
- Create: `src/utils/newsDisplay.test.ts`
- Modify: `src/screens/NoticiasScreen.tsx` (remove duplicated constants/function, import from util)

**Step 1: Write failing tests for `relativeTime`**

Create `src/utils/newsDisplay.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { relativeTime } from './newsDisplay'

describe('relativeTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "hace Xm" for times less than 60 minutes ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T14:30:00Z'))
    expect(relativeTime('2026-04-04T14:00:00Z')).toBe('hace 30m')
  })

  it('returns "hace Xh" for times between 1 and 24 hours ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T16:00:00Z'))
    expect(relativeTime('2026-04-04T14:00:00Z')).toBe('hace 2h')
  })

  it('returns "hace Xd" for times more than 24 hours ago', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-06T14:00:00Z'))
    expect(relativeTime('2026-04-04T14:00:00Z')).toBe('hace 2d')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/newsDisplay.test.ts`

Expected: fails with "Cannot find module './newsDisplay'".

**Step 3: Create `src/utils/newsDisplay.ts`**

```typescript
import type { NewsCategory } from '../adapters/types'

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  argentina: 'Argentina',
  global: 'Global',
  geopolitics: 'Geopolítica',
  watchlist: 'Watchlist',
}

export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  argentina: 'bg-blue-100 text-blue-700',
  global: 'bg-green-100 text-green-700',
  geopolitics: 'bg-orange-100 text-orange-700',
  watchlist: 'bg-purple-100 text-purple-700',
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `hace ${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours}h`
  return `hace ${Math.floor(diffHours / 24)}d`
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/newsDisplay.test.ts`

Expected: 3 tests pass.

**Step 5: Update `NoticiasScreen` to import from the utility**

In `src/screens/NoticiasScreen.tsx`:
- Remove the `CATEGORY_LABELS`, `CATEGORY_COLORS`, and `relativeTime` declarations
- Add this import:

```typescript
import { CATEGORY_LABELS, CATEGORY_COLORS, relativeTime } from '../utils/newsDisplay'
```

**Step 6: Run all tests**

Run: `npm test`

Expected: all tests pass.

**Step 7: TypeScript check**

Run: `npx tsc -p tsconfig.app.json --noEmit`

Expected: no errors.

**Step 8: Commit**

```bash
git add src/utils/newsDisplay.ts src/utils/newsDisplay.test.ts src/screens/NoticiasScreen.tsx
git commit -m "$(cat <<'EOF'
refactor: extract news display utilities to shared module

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update `NoticiasScreen` — `NewsCard` navigates instead of opening URL

**Files:**
- Modify: `src/screens/NoticiasScreen.tsx`

**Step 1: Update `NoticiasScreen`**

The `NewsCard` component currently renders as an `<a>` tag that opens the URL directly. It needs to navigate to `/noticias/:index` instead.

Replace the entire `NewsCard` component and the news list in `NoticiasScreen`:

1. Add `useNavigate` to the React Router import at the top of `NoticiasScreen.tsx`:

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import type { NewsItem } from '../adapters/types'
import { CATEGORY_LABELS, CATEGORY_COLORS, relativeTime } from '../utils/newsDisplay'
```

2. Update `NewsCard` to accept an `index` prop and use `onClick` for navigation:

```tsx
function NewsCard({ item, index, onPress }: { item: NewsItem; index: number; onPress: (i: number) => void }) {
  return (
    <div
      onClick={() => onPress(index)}
      className="block bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-100 active:bg-slate-50 cursor-pointer"
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
    </div>
  )
}
```

3. In `NoticiasScreen`, add `useNavigate` and update the list render:

```tsx
export default function NoticiasScreen() {
  const adapter = useAdapter()
  const navigate = useNavigate()
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
          <NewsCard
            key={item.url}
            item={item}
            index={i}
            onPress={(idx) => navigate(`/noticias/${idx}`)}
          />
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Run all tests**

Run: `npm test`

Expected: all tests pass.

**Step 3: TypeScript check**

Run: `npx tsc -p tsconfig.app.json --noEmit`

Expected: no errors.

**Step 4: Commit**

```bash
git add src/screens/NoticiasScreen.tsx
git commit -m "$(cat <<'EOF'
feat: navigate to detail screen on news card tap

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Install `react-markdown`, create `NoticiaDetailScreen`, add route

**Files:**
- Create: `src/screens/NoticiaDetailScreen.tsx`
- Modify: `src/App.tsx`

**Step 1: Install react-markdown**

Run: `npm install react-markdown`

**Step 2: Create `src/screens/NoticiaDetailScreen.tsx`**

```tsx
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAdapter } from '../AdapterContext'
import { CATEGORY_LABELS, CATEGORY_COLORS, relativeTime } from '../utils/newsDisplay'

export default function NoticiaDetailScreen() {
  const { index } = useParams<{ index: string }>()
  const adapter = useAdapter()
  const navigate = useNavigate()

  const idx = Number(index)
  const news = adapter.getNews()
  const item = !isNaN(idx) && idx >= 0 && idx < news.length ? news[idx] : null

  if (!item) return <Navigate to="/noticias" replace />

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-24">
        <button
          onClick={() => navigate('/noticias')}
          className="flex items-center gap-1 text-sm text-slate-500 mb-4"
        >
          ← Volver
        </button>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="text-xs text-slate-400">{item.source}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">{relativeTime(item.publishedAt)}</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 leading-snug mb-4">
          {item.title}
        </h1>

        {item.summary && (
          <div className="text-sm text-slate-700 leading-relaxed mb-6 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mb-2 [&_p]:mb-3">
            <ReactMarkdown>{item.summary}</ReactMarkdown>
          </div>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 font-medium"
        >
          Leer nota completa →
        </a>
      </div>
    </div>
  )
}
```

**Step 3: Add route to `src/App.tsx`**

Import the new screen and add the route before the wildcard:

```tsx
import NoticiaDetailScreen from './screens/NoticiaDetailScreen'
```

Add after the `/noticias` route:

```tsx
<Route path="/noticias/:index" element={<NoticiaDetailScreen />} />
```

**Step 4: Run all tests**

Run: `npm test`

Expected: all tests pass.

**Step 5: TypeScript check**

Run: `npx tsc -p tsconfig.app.json --noEmit`

Expected: no errors.

**Step 6: Commit**

```bash
git add src/screens/NoticiaDetailScreen.tsx src/App.tsx package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add NoticiaDetailScreen with markdown summary and route

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
