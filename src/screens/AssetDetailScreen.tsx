// src/screens/AssetDetailScreen.tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import { getCompanyName } from '../utils/companyNames'
import VariationBadge from '../components/VariationBadge'
import type { VariationPeriod } from '../adapters/types'

const PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': 'Diario',
  '1w': 'Semanal',
  '1m': 'Mensual',
  '3m': 'Trimestral',
}

const HERO_PERIOD_LABELS: Record<VariationPeriod, string> = {
  '1d': 'Hoy',
  '1w': 'Esta semana',
  '1m': 'Este mes',
  '3m': 'Últimos 3 meses',
}

const PERIOD_ORDER: VariationPeriod[] = ['1d', '1w', '1m', '3m']

export default function AssetDetailScreen() {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { currency, setCurrency, variationPeriod } = usePreferencesStore()

  if (!symbol) return null

  const prices = adapter.getPrices()
  const allHistory = adapter.getAllHistoryPrices()
  const current = prices[symbol]
  const companyName = getCompanyName(symbol)

  const heroHist = allHistory[variationPeriod][symbol]
  const heroVariation = current && heroHist
    ? currency === 'ars'
      ? calcVariation(current.ars, heroHist.ars ?? undefined)
      : calcVariation(current.usd, heroHist.usd ?? undefined)
    : null

  function formatPrice(ars: number | null, usd: number | null): string {
    if (currency === 'ars') {
      return ars !== null ? `$${ars.toLocaleString('es-AR')}` : '—'
    }
    return usd !== null ? `u$s ${usd.toLocaleString('es-AR', { minimumFractionDigits: 4 })}` : '—'
  }

  const currentPriceStr = current ? formatPrice(current.ars, current.usd) : '—'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 text-xl">←</button>
          <span className="font-bold text-slate-900">{symbol}</span>
        </div>
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

      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-2xl font-black text-slate-900 leading-none">{symbol}</p>
          {companyName && <p className="text-sm text-slate-400 mt-0.5 mb-2">{companyName}</p>}
          <p className="text-4xl font-black text-slate-900 mt-1">{currentPriceStr}</p>
          {heroVariation !== null && (
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
              heroVariation >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              <span>{heroVariation >= 0 ? '↗' : '↘'} {heroVariation >= 0 ? '+' : ''}{heroVariation.toFixed(2)}%</span>
              <span className={heroVariation >= 0 ? 'text-green-400' : 'text-red-300'}>
                {HERO_PERIOD_LABELS[variationPeriod]}
              </span>
            </div>
          )}
        </div>

        {/* Historial */}
        {current && (
          <div className="mx-3 mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Historial</h2>
            </div>
            {PERIOD_ORDER.map((period, i) => {
              const hist = allHistory[period][symbol]
              const variation = hist
                ? currency === 'ars'
                  ? calcVariation(current.ars, hist.ars ?? undefined)
                  : calcVariation(current.usd, hist.usd ?? undefined)
                : null
              const histPriceStr = hist ? formatPrice(hist.ars, hist.usd) : '—'

              return (
                <div
                  key={period}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < PERIOD_ORDER.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: '#dde3f5', color: '#4a5fa0' }}
                  >
                    {period === '1d' ? '1D' : period === '1w' ? '1S' : period === '1m' ? '1M' : '3M'}
                  </div>
                  <span className="flex-1 text-sm text-slate-500">{PERIOD_LABELS[period]}</span>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">{histPriceStr}</p>
                    <VariationBadge value={variation} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
