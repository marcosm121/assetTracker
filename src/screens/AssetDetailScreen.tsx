import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import PriceChart from '../components/PriceChart'
import type { HistoryPoint } from '../adapters/types'
import { subDays, subMonths, subYears } from '../utils/dates'

type Period = '1S' | '1M' | '3M' | '1A'

const PERIODS: Period[] = ['1S', '1M', '3M', '1A']

function periodToFrom(period: Period, now: Date): Date {
  switch (period) {
    case '1S': return subDays(now, 7)
    case '1M': return subMonths(now, 1)
    case '3M': return subMonths(now, 3)
    case '1A': return subYears(now, 1)
  }
}

export default function AssetDetailScreen() {
  const { market, symbol } = useParams<{ market: string; symbol: string }>()
  const navigate = useNavigate()
  const adapter = useAdapter()
  const [period, setPeriod] = useState<Period>('1M')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!market || !symbol) return
    setLoading(true)
    setError(null)

    const now = new Date()
    const from = periodToFrom(period, now)

    Promise.all([
      adapter.getQuote(symbol, market),
      adapter.getHistory(symbol, market, from, now),
    ])
      .then(([quote, hist]) => {
        setPrice(quote.price)
        setHistory(hist)
      })
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setLoading(false))
  }, [market, symbol, period, adapter])

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">←</button>
        <div>
          <h1 className="font-semibold">{symbol}</h1>
          <p className="text-xs text-gray-500">{market}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Price */}
        <div>
          {loading ? (
            <div className="h-8 w-32 bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold">
              {price !== null ? `$${price.toLocaleString('es-AR')}` : '—'}
            </p>
          )}
        </div>

        {/* Period tabs */}
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chart */}
        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : loading ? (
          <div className="h-[300px] bg-gray-800 rounded animate-pulse" />
        ) : (
          <PriceChart data={history} />
        )}
      </div>
    </div>
  )
}
