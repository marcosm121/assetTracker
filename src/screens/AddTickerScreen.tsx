import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'

type OpStatus = { type: 'idle' } | { type: 'loading' } | { type: 'error'; message: string }

function getErrorMessage(err: unknown, operation: 'add' | 'remove'): string {
  const msg = err instanceof Error ? err.message : ''
  if (operation === 'add') {
    if (msg.includes('409')) return 'El ticker ya existe.'
    return 'No se pudo agregar. Intentá de nuevo.'
  } else {
    if (msg.includes('404')) return 'Ticker no encontrado.'
    return 'No se pudo quitar. Intentá de nuevo.'
  }
}

export default function AddTickerScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { items, setItems } = useWatchlistStore()
  const [symbol, setSymbol] = useState('')
  const [addStatus, setAddStatus] = useState<OpStatus>({ type: 'idle' })
  const [removeErrors, setRemoveErrors] = useState<Record<string, string>>({})

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const s = symbol.trim().toUpperCase()
    if (!s) return
    setAddStatus({ type: 'loading' })
    try {
      await adapter.addTicker(s)
      setItems(adapter.getWatchlist())
      setSymbol('')
      setAddStatus({ type: 'idle' })
    } catch (err) {
      const isNetwork = err instanceof TypeError
      const msg = isNetwork
        ? 'Error de conexión. Verificá tu red.'
        : getErrorMessage(err, 'add')
      setAddStatus({ type: 'error', message: msg })
    }
  }

  async function handleRemove(sym: string) {
    setRemoveErrors(prev => ({ ...prev, [sym]: '' }))
    try {
      await adapter.removeTicker(sym)
      setItems(adapter.getWatchlist())
    } catch (err) {
      const isNetwork = err instanceof TypeError
      const msg = isNetwork
        ? 'Error de conexión. Verificá tu red.'
        : getErrorMessage(err, 'remove')
      setRemoveErrors(prev => ({ ...prev, [sym]: msg }))
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 text-xl">←</button>
        <h1 className="font-bold text-slate-900">Gestionar activos</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Add form */}
        <div>
          <p className="text-sm text-slate-500 mb-3">Agregar ticker</p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="Ej: GGAL"
              className="flex-1 bg-white border border-slate-200 text-slate-900 rounded-lg px-4 py-2.5 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={addStatus.type === 'loading' || !symbol.trim()}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors"
            >
              {addStatus.type === 'loading' ? '...' : 'Agregar'}
            </button>
          </form>
          {addStatus.type === 'error' && (
            <p className="text-red-500 text-sm mt-2">{addStatus.message}</p>
          )}
        </div>

        {/* Current tickers */}
        {items.length > 0 && (
          <div>
            <p className="text-sm text-slate-500 mb-3">Activos en seguimiento</p>
            <div className="divide-y divide-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
              {items.map(sym => (
                <div key={sym} className="flex items-center justify-between px-4 py-3">
                  <span className="font-mono font-semibold text-slate-900">{sym}</span>
                  <div className="text-right">
                    {removeErrors[sym] && (
                      <p className="text-red-500 text-xs mb-1">{removeErrors[sym]}</p>
                    )}
                    <button
                      onClick={() => handleRemove(sym)}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
