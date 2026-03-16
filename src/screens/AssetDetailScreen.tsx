import { useParams, useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod } from '../adapters/types'

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': '1D',
  '1w': '1S',
  '1m': '1M',
  '3m': '3M',
}

export default function AssetDetailScreen() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { currency } = usePreferencesStore()

  if (!symbol) return null

  const prices = adapter.getPrices()
  const allHistory = adapter.getAllHistoryPrices()
  const current = prices[symbol]

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="font-semibold text-lg">{symbol}</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Current price */}
        <div>
          {current ? (
            <p className="text-3xl font-bold">
              {currency === 'ars'
                ? `$${current.ars.toLocaleString('es-AR')}`
                : `u$s ${current.usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}`}
            </p>
          ) : (
            <p className="text-gray-500">Sin datos disponibles</p>
          )}
        </div>

        {/* Variation grid */}
        {current && (
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(PERIOD_LABELS) as [VariationPeriod, string][]).map(([period, label]) => {
              const hist = allHistory[period][symbol]
              const variation = hist
                ? currency === 'ars'
                  ? calcVariation(current.ars, hist.ars ?? undefined)
                  : calcVariation(current.usd, hist.usd ?? undefined)
                : null
              return (
                <div key={period} className="bg-gray-900 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <VariationBadge value={variation} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
