// src/components/BottomNav.tsx
import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/',         label: 'WATCHLIST', icon: '★' },
  { path: '/dolares',  label: 'DÓLARES',   icon: '$' },
  { path: '/noticias', label: 'NOTICIAS',  icon: '📰' },
] as const

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Don't highlight any tab for overlay screens
  const activeTab = ['/', '/dolares', '/noticias'].includes(pathname) ? pathname : '/'

  return (
    <nav className="bg-white border-t border-slate-200 flex">
      {TABS.map(({ path, label, icon }) => {
        const active = activeTab === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
              active ? 'text-slate-800' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-slate-800' : 'text-slate-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
