import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginScreen from './screens/LoginScreen'
import WatchlistScreen from './screens/WatchlistScreen'
import AssetDetailScreen from './screens/AssetDetailScreen'
import SymbolSearchScreen from './screens/SymbolSearchScreen'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/" element={<RequireAuth><WatchlistScreen /></RequireAuth>} />
        <Route path="/asset/:market/:symbol" element={<RequireAuth><AssetDetailScreen /></RequireAuth>} />
        <Route path="/search" element={<RequireAuth><SymbolSearchScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
