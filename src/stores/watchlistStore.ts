import { create } from 'zustand'
import { loadWatchlist, saveWatchlist } from '../utils/storage'

interface WatchlistState {
  items: string[]
  setItems: (items: string[]) => void
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  items: loadWatchlist(),
  setItems: (items) => {
    saveWatchlist(items)
    set({ items })
  },
}))
