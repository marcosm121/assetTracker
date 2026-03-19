// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WatchlistScreen from './screens/WatchlistScreen'
import AssetDetailScreen from './screens/AssetDetailScreen'
import AddTickerScreen from './screens/AddTickerScreen'
import DolaresScreen from './screens/DolaresScreen'
import NoticiasScreen from './screens/NoticiasScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<WatchlistScreen />} />
            <Route path="/asset/:symbol" element={<AssetDetailScreen />} />
            <Route path="/add" element={<AddTickerScreen />} />
            <Route path="/dolares" element={<DolaresScreen />} />
            <Route path="/noticias" element={<NoticiasScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
