# Noticia Detail Screen Design

**Date:** 2026-04-05

## Summary

Add a detail screen for individual news items that shows the markdown summary before optionally opening the full article in an external browser.

## API Contract Change

`NewsItem` gains an optional `summary` field:

```typescript
export interface NewsItem {
  title: string
  url: string
  source: string
  publishedAt: string      // ISO 8601
  category: NewsCategory
  summary?: string         // markdown, optional
}
```

Optional to maintain compatibility if any item lacks the field.

## Routing

New route added to `App.tsx`:
```
/noticias/:index  →  NoticiaDetailScreen
```

- `:index` is the position in `adapter.getNews()` (the sorted cache)
- If cache is empty or index is out of bounds → redirect to `/noticias`

`NewsCard` in `NoticiasScreen` changes from `<a href target="_blank">` to `useNavigate('/noticias/${index}')`.

This mirrors the existing `/asset/:symbol` → `AssetDetailScreen` pattern.

## NoticiaDetailScreen

**Data source:** `adapter.getNews()[index]` — synchronous read from cache, no fetch needed.

**Layout (top to bottom):**
1. Back button "← Volver" → navigates to `/noticias`
2. Category badge + source + relative time (same as NewsCard)
3. Title (large, prominent)
4. Summary rendered as markdown (`react-markdown`)
5. "Leer nota completa →" link at the bottom — opens `item.url` in external browser (`target="_blank"`, `rel="noopener noreferrer"`)

**Error handling:** invalid index → `<Navigate to="/noticias" replace />`

**No loading state** — data is already in cache.

## Dependencies

- Install `react-markdown` for markdown rendering

## Out of Scope

- Persistent URLs (detail only works within a session where cache is populated)
- Sharing / deep-linking
- In-app webview
