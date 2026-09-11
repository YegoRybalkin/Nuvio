import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarClock,
  Gamepad2,
  LayoutDashboard,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import SettingsModal from './SettingsModal'
import XpBar from './XpBar'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/study', label: 'Study', icon: Target },
  { to: '/games', label: 'Games', icon: Gamepad2 },
  { to: '/review', label: 'Review', icon: RotateCcw },
  { to: '/exams', label: 'Exams', icon: CalendarClock },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
  { to: '/tutor', label: 'Tutor', icon: Bot },
]

export default function Layout() {
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex min-h-svh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
              <Sparkles size={18} />
            </span>
            <span className="hidden sm:inline">Nuvio</span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-thin sm:gap-1">
            {NAV.map((item) => {
              const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                    active ? 'bg-brand-500 text-white' : 'text-muted hover:bg-white/5 hover:text-ink'
                  }`}
                >
                  <item.icon size={15} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <XpBar />
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="rounded-full border border-white/10 p-2 text-muted transition hover:border-white/20 hover:text-ink"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
