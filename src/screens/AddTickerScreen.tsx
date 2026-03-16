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
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">←</button>
        <h1 className="font-semibold">Gestionar activos</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Add form */}
        <div>
          <p className="text-sm text-gray-400 mb-3">Agregar ticker</p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              placeholder="Ej: GGAL"
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2.5 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={addStatus.type === 'loading' || !symbol.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 font-medium transition-colors"
            >
              {addStatus.type === 'loading' ? '...' : 'Agregar'}
            </button>
          </form>
          {addStatus.type === 'error' && (
            <p className="text-red-400 text-sm mt-2">{addStatus.message}</p>
          )}
        </div>

        {/* Current tickers */}
        {items.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-3">Activos en seguimiento</p>
            <div className="divide-y divide-gray-800 rounded-xl overflow-hidden">
              {items.map(sym => (
                <div key={sym} className="bg-gray-900 flex items-center justify-between px-4 py-3">
                  <span className="font-mono font-medium">{sym}</span>
                  <div className="text-right">
                    {removeErrors[sym] && (
                      <p className="text-red-400 text-xs mb-1">{removeErrors[sym]}</p>
                    )}
                    <button
                      onClick={() => handleRemove(sym)}
                      className="text-red-400 hover:text-red-300 text-sm"
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
