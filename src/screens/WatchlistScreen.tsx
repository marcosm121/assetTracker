import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import DollarFooter from '../components/DollarFooter'
import type { VariationPeriod } from '../adapters/types'

type ScreenStatus = 'loading' | 'error' | 'loaded'

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': '1D',
  '1w': '1S',
  '1m': '1M',
  '3m': '3M',
}

export default function WatchlistScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { items, setItems } = useWatchlistStore()
  const { variationPeriod, setVariationPeriod } = usePreferencesStore()
  const [status, setStatus] = useState<ScreenStatus>('loading')

  useEffect(() => {
    setStatus('loading')
    adapter.fetchAll()
      .then(() => {
        setItems(adapter.getWatchlist())
        setStatus('loaded')
      })
      .catch(() => setStatus('error'))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const prices = adapter.isReady() ? adapter.getPrices() : {}
  const histPrices = adapter.isReady() ? adapter.getHistoryPrices(variationPeriod) : {}

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between z-10">
        <h1 className="font-semibold text-lg">Mi Watchlist</h1>
        <div className="flex gap-1">
          {(Object.entries(PERIOD_LABELS) as [VariationPeriod, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setVariationPeriod(val)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                variationPeriod === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 divide-y divide-gray-800">
        {status === 'error' && (
          <div className="p-6 text-center">
            <p className="text-red-400 text-sm mb-3">No se pudieron cargar los datos.</p>
            <button
              onClick={() => {
                setStatus('loading')
                adapter.fetchAll()
                  .then(() => { setItems(adapter.getWatchlist()); setStatus('loaded') })
                  .catch(() => setStatus('error'))
              }}
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        )}

        {status === 'loading' && items.length === 0 && (
          <p className="text-gray-500 text-center py-16 text-sm">Cargando...</p>
        )}

        {(status === 'loading' && items.length > 0 ? items : status === 'loaded' ? items : []).map(symbol => {
          const current = prices[symbol]
          const hist = histPrices[symbol]
          const isLoading = status === 'loading'
          const variation = current && hist ? calcVariation(current.ars, hist.ars ?? undefined) : null

          return (
            <button
              key={symbol}
              onClick={() => navigate(`/asset/${symbol}`)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-900 transition-colors text-left"
            >
              <div>
                <p className="font-medium">{symbol}</p>
              </div>
              <div className="text-right">
                {isLoading ? (
                  <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="font-medium text-sm">
                      {current ? `$${current.ars.toLocaleString('es-AR')}` : '—'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {current ? `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}` : ''}
                    </p>
                    <VariationBadge value={variation} />
                  </>
                )}
              </div>
            </button>
          )
        })}

        {status === 'loaded' && items.length === 0 && (
          <p className="text-gray-500 text-center py-16 text-sm">
            Tu watchlist está vacía.<br />Tocá + para agregar activos.
          </p>
        )}
      </div>

      {/* Dollar footer */}
      {adapter.isReady() && (
        <DollarFooter
          rates={adapter.getDollarRates()}
          historyRates={adapter.getHistoryDollarRates(variationPeriod)}
        />
      )}

      {/* Add button */}
      <button
        onClick={() => navigate('/add')}
        className="fixed bottom-20 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 text-2xl flex items-center justify-center shadow-lg transition-colors"
      >
        +
      </button>
    </div>
  )
}
