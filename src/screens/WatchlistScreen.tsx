// src/screens/WatchlistScreen.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import { getCompanyName } from '../utils/companyNames'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod } from '../adapters/types'

type ScreenStatus = 'loading' | 'error' | 'loaded'

const PERIOD_OPTIONS: { value: VariationPeriod; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
]

export default function WatchlistScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { items, setItems } = useWatchlistStore()
  const { variationPeriod, setVariationPeriod, currency, setCurrency } = usePreferencesStore()
  const [status, setStatus] = useState<ScreenStatus>('loading')

  useEffect(() => {
    if (adapter.isReady()) {
      setItems(adapter.getWatchlist())
      setStatus('loaded')
      return
    }
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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 pt-3 pb-0 z-10">
        {/* Row 1: title + ARS/USD toggle */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-lg text-slate-900">Mi Watchlist</h1>
          <div className="flex bg-slate-100 rounded-full p-0.5">
            <button
              onClick={() => setCurrency('usd')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                currency === 'usd' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('ars')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                currency === 'ars' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              ARS
            </button>
          </div>
        </div>
        {/* Row 2: period pills + add button */}
        <div className="flex items-center gap-1 pb-3">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setVariationPeriod(value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                variationPeriod === value
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => navigate('/add')}
            className="ml-auto w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center text-lg font-bold transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {status === 'error' && (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-3">No se pudieron cargar los datos.</p>
            <button
              onClick={() => {
                setStatus('loading')
                adapter.fetchAll()
                  .then(() => { setItems(adapter.getWatchlist()); setStatus('loaded') })
                  .catch(() => setStatus('error'))
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        )}

        {status === 'loading' && items.length === 0 && (
          <p className="text-slate-400 text-center py-16 text-sm">Cargando...</p>
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
          const companyName = getCompanyName(symbol)

          return (
            <button
              key={symbol}
              onClick={() => navigate(`/asset/${symbol}`)}
              className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow w-full"
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: '#dde3f5', color: '#4a5fa0' }}
              >
                {symbol[0]}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{symbol}</p>
                {companyName && (
                  <p className="text-xs text-slate-400 truncate">{companyName}</p>
                )}
              </div>
              {/* Price + variation */}
              <div className="text-right flex-shrink-0">
                {isLoading ? (
                  <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-sm">
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
          <p className="text-slate-400 text-center py-16 text-sm">
            Tu watchlist está vacía.<br />Tocá + para agregar activos.
          </p>
        )}
      </div>
    </div>
  )
}
