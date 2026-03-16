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
  const { variationPeriod, setVariationPeriod, currency, setCurrency } = usePreferencesStore()
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
    <div className="h-screen bg-gray-950 text-white max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex flex-col gap-2 z-10">
        {/* Row 1: title + period pills + add button */}
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg">Mi Watchlist</h1>
          <div className="flex gap-1 items-center">
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
            <button
              onClick={() => navigate('/add')}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg transition-colors"
            >
              +
            </button>
          </div>
        </div>
        {/* Row 2: ARS/USD switch */}
        <div className="flex justify-center">
          <div className="flex bg-gray-800 rounded-full p-0.5">
            <button
              onClick={() => setCurrency('ars')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${
                currency === 'ars' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              ARS $
            </button>
            <button
              onClick={() => setCurrency('usd')}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${
                currency === 'usd' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              USD u$s
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 divide-y divide-gray-800 overflow-y-auto">
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
          const variation = current && hist
            ? currency === 'ars'
              ? calcVariation(current.ars, hist.ars ?? undefined)
              : calcVariation(current.usd, hist.usd ?? undefined)
            : null

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
                      {current
                        ? currency === 'ars'
                          ? `$${current.ars.toLocaleString('es-AR')}`
                          : `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}`
                        : '—'}
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

      {/* Dollar footer — always visible */}
      <DollarFooter
        rates={adapter.isReady() ? adapter.getDollarRates() : undefined}
        historyRates={adapter.isReady() ? adapter.getHistoryDollarRates(variationPeriod) : undefined}
      />
    </div>
  )
}
