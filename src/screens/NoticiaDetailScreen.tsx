import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAdapter } from '../AdapterContext'
import { CATEGORY_LABELS, CATEGORY_COLORS, relativeTime } from '../utils/newsDisplay'

type ScreenState = 'loading' | 'error' | 'ready'

export default function NoticiaDetailScreen() {
  const { index } = useParams<{ index: string }>()
  const adapter = useAdapter()
  const navigate = useNavigate()

  const [state, setState] = useState<ScreenState>(
    adapter.getNews().length > 0 ? 'ready' : 'loading'
  )

  useEffect(() => {
    if (adapter.getNews().length > 0) return
    adapter.fetchNews()
      .then(() => setState('ready'))
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
          type="button"
          onClick={() => navigate('/noticias')}
          className="text-sm text-blue-600 font-medium"
        >
          Volver
        </button>
      </div>
    )
  }

  const idx = Number(index)
  const news = adapter.getNews()
  const item = !isNaN(idx) && idx >= 0 && idx < news.length ? news[idx] : null

  if (!item) return <Navigate to="/noticias" replace />

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-24">
        <button
          type="button"
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
