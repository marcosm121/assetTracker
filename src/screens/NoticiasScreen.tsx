import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import type { NewsItem } from '../adapters/types'
import { CATEGORY_LABELS, CATEGORY_COLORS, relativeTime } from '../utils/newsDisplay'

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

type ScreenState = 'loading' | 'error' | 'loaded'

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
