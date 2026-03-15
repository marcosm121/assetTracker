import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'
import { useWatchlistStore } from '../stores/watchlistStore'
import type { SymbolResult } from '../adapters/types'

export default function SymbolSearchScreen() {
  const navigate = useNavigate()
  const adapter = useAdapter()
  const { addItem, removeItem, hasItem } = useWatchlistStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    setError(null)
    try {
      const res = await adapter.searchSymbol(q)
      setResults(res)
    } catch {
      setError('No se pudo buscar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function toggleItem(item: SymbolResult) {
    if (hasItem(item.symbol, item.market)) {
      removeItem(item.symbol, item.market)
    } else {
      addItem(item)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white max-w-lg mx-auto">
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          ←
        </button>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por símbolo o nombre..."
          className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="divide-y divide-gray-800">
        {loading && <p className="text-gray-500 text-center py-8 text-sm">Buscando...</p>}
        {error && <p className="text-red-400 text-center py-8 text-sm">{error}</p>}
        {results.map(item => {
          const inList = hasItem(item.symbol, item.market)
          return (
            <button
              key={`${item.market}-${item.symbol}`}
              onClick={() => toggleItem(item)}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-900 transition-colors text-left"
            >
              <div>
                <p className="font-medium">{item.symbol}</p>
                <p className="text-sm text-gray-400">{item.label}</p>
              </div>
              <span className={`text-sm font-medium ${inList ? 'text-red-400' : 'text-blue-400'}`}>
                {inList ? 'Quitar' : '+ Agregar'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
