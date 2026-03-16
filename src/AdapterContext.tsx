import React, { createContext, useContext, useRef } from 'react'
import { InvestorDataAdapter } from './adapters/InvestorDataAdapter'
import type { DataProvider } from './adapters/types'
import { INVESTOR_DATA_URL } from './config'

const AdapterContext = createContext<DataProvider | null>(null)

export function AdapterProvider({ children }: { children: React.ReactNode }) {
  const adapterRef = useRef<DataProvider>(new InvestorDataAdapter(INVESTOR_DATA_URL))
  return (
    <AdapterContext.Provider value={adapterRef.current}>
      {children}
    </AdapterContext.Provider>
  )
}

export function useAdapter(): DataProvider {
  const ctx = useContext(AdapterContext)
  if (!ctx) throw new Error('useAdapter must be used within AdapterProvider')
  return ctx
}
