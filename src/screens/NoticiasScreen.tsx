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
        {news.map((item) => (
          <NewsCard key={item.url} item={item} />
        ))}
      </div>
    </div>
  )
}
