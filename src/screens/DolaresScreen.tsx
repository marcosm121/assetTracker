import { useAdapter } from '../AdapterContext'
import { usePreferencesStore } from '../stores/preferencesStore'
import { calcVariation } from '../utils/variation'
import VariationBadge from '../components/VariationBadge'
import type { DollarRates, VariationPeriod } from '../adapters/types'

const DOLLAR_LABELS: { key: keyof DollarRates; label: string }[] = [
  { key: 'oficial',         label: 'Oficial' },
  { key: 'blue',            label: 'Blue' },
  { key: 'bolsa',           label: 'Bolsa' },
  { key: 'contadoconliqui', label: 'CCL' },
]

const PERIOD_OPTIONS: { value: VariationPeriod; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
]

export default function DolaresScreen() {
  const adapter = useAdapter()
  const { variationPeriod, setVariationPeriod } = usePreferencesStore()

  const emptyRates: DollarRates = { oficial: null, blue: null, bolsa: null, contadoconliqui: null }
  const rates = adapter.isReady() ? adapter.getDollarRates() : emptyRates
  const histRates = adapter.isReady() ? adapter.getHistoryDollarRates(variationPeriod) : emptyRates

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 pt-3 pb-0 z-10">
        <h1 className="font-bold text-lg text-slate-900 mb-2">Dólares</h1>
        {/* Period pills */}
        <div className="flex gap-1 pb-3">
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
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {DOLLAR_LABELS.map(({ key, label }) => {
          const current = rates[key] ?? null
          const hist = histRates[key] ?? undefined
          const variation = current !== null ? calcVariation(current, hist) : null
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-slate-900">{label}</span>
              <div className="text-right">
                <p className="font-bold text-slate-900">
                  {current !== null ? `$${current.toLocaleString('es-AR')}` : '—'}
                </p>
                <VariationBadge value={variation} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
