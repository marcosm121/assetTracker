import { calcVariation } from '../utils/variation'
import VariationBadge from './VariationBadge'
import type { DollarRates } from '../adapters/types'

interface Props {
  rates?: Partial<DollarRates>
  historyRates?: Partial<DollarRates>
}

const LABELS: { key: keyof DollarRates; label: string }[] = [
  { key: 'oficial', label: 'Oficial' },
  { key: 'blue', label: 'Blue' },
  { key: 'bolsa', label: 'Bolsa' },
  { key: 'contadoconliqui', label: 'CCL' },
]

export default function DollarFooter({ rates = {}, historyRates = {} }: Props) {
  return (
    <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {LABELS.map(({ key, label }) => {
          const current = rates[key] ?? null
          const reference = historyRates[key] ?? undefined
          const variation = current !== null ? calcVariation(current, reference) : null
          return (
            <div key={key} className="flex-shrink-0 text-center">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-white">
                {current !== null ? `$${current.toLocaleString('es-AR')}` : '—'}
              </p>
              <VariationBadge value={variation} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
