import React, { createContext, useContext, useRef } from 'react'
import { IoLAdapter } from './adapters/IoLAdapter'
import type { MarketDataProvider } from './adapters/types'
import { useAuthStore } from './stores/authStore'

const AdapterContext = createContext<MarketDataProvider | null>(null)

export function AdapterProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore.getState().setAuth
  const adapterRef = useRef<MarketDataProvider>(
    new IoLAdapter(undefined, (token, refresh, expiresIn) => setAuth(token, refresh, expiresIn))
  )
  return (
    <AdapterContext.Provider value={adapterRef.current}>
      {children}
    </AdapterContext.Provider>
  )
}

export function useAdapter(): MarketDataProvider {
  const ctx = useContext(AdapterContext)
  if (!ctx) throw new Error('useAdapter must be used within AdapterProvider')
  return ctx
}
