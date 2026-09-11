import { Library as LibraryIcon, Settings, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import SettingsModal from './SettingsModal'
import XpBar from './XpBar'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="flex min-h-svh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
              <Sparkles size={18} />
            </span>
            Nuvio
          </Link>
          <div className="flex items-center gap-2">
            <XpBar />
            {!isHome && (
              <Link
                to="/library"
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-muted transition hover:border-white/20 hover:text-ink"
              >
                <LibraryIcon size={16} />
                <span className="hidden sm:inline">Library</span>
              </Link>
            )}
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
      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted">
        Built on learning science: active recall · spaced repetition · interleaving.
      </footer>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
