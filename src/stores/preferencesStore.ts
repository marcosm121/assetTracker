import { create } from 'zustand'
import { loadPreferences, savePreferences } from '../utils/storage'
import type { VariationPeriod } from '../adapters/types'

interface PreferencesState {
  variationPeriod: VariationPeriod
  setVariationPeriod: (period: VariationPeriod) => void
  currency: 'ars' | 'usd'
  setCurrency: (c: 'ars' | 'usd') => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  variationPeriod: loadPreferences().variationPeriod,

  setVariationPeriod: (period) => {
    savePreferences({ variationPeriod: period })
    set({ variationPeriod: period })
  },

  currency: 'ars',
  setCurrency: (c) => set({ currency: c }),
}))
