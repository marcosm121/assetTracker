import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWatchlistStore } from '../stores/watchlistStore'
import { usePreferencesStore } from '../stores/preferencesStore'
import { useAdapter } from '../AdapterContext'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod, WatchlistItem } from '../adapters/types'
import { subDays, subMonths, subYears } from '../utils/dates'

interface AssetRow extends WatchlistItem {
  price: number | null
  variation: number | null
  loading: boolean
}

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': 'vs día ant.',
  '1w': 'vs LW',
  '1m': 'vs LM',
  '3m': 'vs L3M',
  '1y': 'vs LY',
}

export default function WatchlistScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const items = useWatchlistStore(s => s.items)
  const { variationPeriod, setVariationPeriod } = usePreferencesStore()
  const [rows, setRows] = useState<AssetRow[]>([])

  const loadAsset = useCallback(async (item: WatchlistItem): Promise<AssetRow> => {
    try {
      const now = new Date()
      const from = periodToFrom(variationPeriod, now)
      const [quote, history] = await Promise.all([
        adapter.getQuote(item.symbol, item.market),
        adapter.getHistory(item.symbol, item.market, from, now),
      ])
      const refPrice = history[0]?.close ?? null
      return {
        ...item,
        price: quote.price,
        variation: calcVariation(quote.price, refPrice ?? undefined),
        loading: false,
      }
    } catch {
      return { ...item, price: null, variation: null, loading: false }
    }
  }, [adapter, variationPeriod])

  useEffect(() => {
    if (items.length === 0) {
      setRows([])
      return
    }
    let cancelled = false
    setRows(items.map(i => ({ ...i, price: null, variation: null, loading: true })))
    items.forEach(async (item) => {
      const row = await loadAsset(item)
      if (!cancelled) {
        setRows(prev => prev.map(r => r.symbol === item.symbol && r.market === item.market ? row : r))
      }
    })
    return () => { cancelled = true }
  }, [items, variationPeriod, loadAsset])

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Mi Watchlist</h1>
        <select
          value={variationPeriod}
          onChange={e => setVariationPeriod(e.target.value as VariationPeriod)}
          className="bg-gray-800 text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none"
        >
          {(Object.entries(PERIOD_LABELS) as [VariationPeriod, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-800">
        {rows.length === 0 && (
          <p className="text-gray-500 text-center py-16 text-sm">
            Tu watchlist está vacía.<br />Tocá + para agregar activos.
          </p>
        )}
        {rows.map(row => (
          <button
            key={`${row.market}-${row.symbol}`}
            onClick={() => navigate(`/asset/${row.market}/${row.symbol}`)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-900 transition-colors text-left"
          >
            <div>
              <p className="font-medium">{row.symbol}</p>
              <p className="text-sm text-gray-400">{row.label}</p>
            </div>
            <div className="text-right">
              {row.loading ? (
                <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
              ) : (
                <>
                  <p className="font-medium">{row.price !== null ? `$${row.price.toLocaleString('es-AR')}` : '—'}</p>
                  <VariationBadge value={row.variation} />
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={() => navigate('/search')}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 text-2xl flex items-center justify-center shadow-lg transition-colors"
      >
        +
      </button>
    </div>
  )
}

function periodToFrom(period: VariationPeriod, now: Date): Date {
  switch (period) {
    case '1d': return subDays(now, 1)
    case '1w': return subDays(now, 7)
    case '1m': return subMonths(now, 1)
    case '3m': return subMonths(now, 3)
    case '1y': return subYears(now, 1)
  }
}
