import { create } from 'zustand'
import { loadWatchlist, saveWatchlist } from '../utils/storage'
import type { WatchlistItem } from '../adapters/types'

interface WatchlistState {
  items: WatchlistItem[]
  addItem: (item: WatchlistItem) => void
  removeItem: (symbol: string, market: string) => void
  hasItem: (symbol: string, market: string) => boolean
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: loadWatchlist(),

  addItem: (item) => {
    const items = [...get().items, item]
    saveWatchlist(items)
    set({ items })
  },

  removeItem: (symbol, market) => {
    const items = get().items.filter(i => !(i.symbol === symbol && i.market === market))
    saveWatchlist(items)
    set({ items })
  },

  hasItem: (symbol, market) =>
    get().items.some(i => i.symbol === symbol && i.market === market),
}))
