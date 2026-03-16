import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WatchlistScreen from './screens/WatchlistScreen'
import AssetDetailScreen from './screens/AssetDetailScreen'
import AddTickerScreen from './screens/AddTickerScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WatchlistScreen />} />
        <Route path="/asset/:symbol" element={<AssetDetailScreen />} />
        <Route path="/add" element={<AddTickerScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
