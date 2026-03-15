import { create } from 'zustand'
import { loadAuth, saveAuth, clearAuth } from '../utils/storage'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  isAuthenticated: () => boolean
  setAuth: (accessToken: string, refreshToken: string, expiresIn: number) => void
  clearAuth: () => void
  needsRefresh: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => {
  const persisted = loadAuth()
  return {
    accessToken: persisted?.access_token ?? null,
    refreshToken: persisted?.refresh_token ?? null,
    expiresAt: persisted?.expires_at ?? null,

    isAuthenticated: () => get().accessToken !== null,

    needsRefresh: () => {
      const { expiresAt } = get()
      if (!expiresAt) return false
      return Date.now() > expiresAt - 2 * 60 * 1000 // 2 min buffer
    },

    setAuth: (accessToken, refreshToken, expiresIn) => {
      const expiresAt = Date.now() + expiresIn * 1000
      saveAuth({ access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt })
      set({ accessToken, refreshToken, expiresAt })
    },

    clearAuth: () => {
      clearAuth()
      set({ accessToken: null, refreshToken: null, expiresAt: null })
    },
  }
})
