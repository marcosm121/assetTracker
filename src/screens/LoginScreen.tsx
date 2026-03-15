import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdapter } from '../AdapterContext'

export default function LoginScreen() {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const adapter = useAdapter()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey.trim()) return
    setError(null)
    setLoading(true)
    try {
      await adapter.login(apiKey.trim())
      navigate('/')
    } catch {
      setError('No se pudo autenticar. Verificá tu API key.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">Assets Tracker</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key de InvertirOnLine</label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Pegá tu API key aquí"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !apiKey.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-3 font-medium transition-colors"
          >
            {loading ? 'Conectando...' : 'Conectar'}
          </button>
        </form>
        <p className="text-gray-600 text-xs text-center mt-6">
          Tu API key se guarda localmente en este dispositivo.
        </p>
      </div>
    </div>
  )
}
