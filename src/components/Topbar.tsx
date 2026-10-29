import type React from 'react'
import {
  Activity,
  ChevronRight,
  CircleHelp,
  Database,
  Menu,
  Moon,
  Search,
  Sun,
} from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import type { Dataset } from '../lib/types'

export function Topbar({
  sidebarOpen,
  setSidebarOpen,
  activePage,
  search,
  setSearch,
  utilityPanel,
  setUtilityPanel,
  userName,
  theme,
  toggleTheme,
  onOpenCommandPalette,
  currentDataset,
  onOpenDatasetPicker,
}: {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  activePage: string
  search: string
  setSearch: (search: string) => void
  utilityPanel: 'help' | 'notifications' | null
  setUtilityPanel: React.Dispatch<React.SetStateAction<'help' | 'notifications' | null>>
  userName: string
  theme: Theme
  toggleTheme: () => void
  onOpenCommandPalette?: () => void
  currentDataset?: Dataset | null
  onOpenDatasetPicker?: () => void
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={19} />
        </button>

        <div className="breadcrumb">
          <span>Workspace</span>
          <ChevronRight size={13} />
          <strong>{activePage}</strong>
        </div>

        {currentDataset && (
          <button
            type="button"
            className="topbar-dataset-badge"
            title={`Active dataset: ${currentDataset.name} (Click to switch)`}
            onClick={onOpenDatasetPicker || onOpenCommandPalette}
          >
            <Database size={13} />
            <span className="truncate">{currentDataset.name}</span>
          </button>
        )}
      </div>

      <div className="top-actions">
        {/* Command palette trigger */}
        <button
          type="button"
          className="global-search"
          onClick={onOpenCommandPalette}
          aria-label="Open command search (Cmd+K)"
        >
          <Search size={15} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search or jump to..."
            readOnly
            tabIndex={-1}
          />
          <kbd>⌘ K</kbd>
        </button>

        <span className="top-divider" />

        {/* Theme toggle */}
        <button
          className="icon-button theme-toggle-btn"
          type="button"
          aria-label={`Switch to ${theme === 'midnight' ? 'aurora light' : 'midnight dark'} theme`}
          title={`Switch to ${theme === 'midnight' ? 'Aurora Light' : 'Midnight Glass'}`}
          onClick={toggleTheme}
        >
          {theme === 'midnight' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Quick Help */}
        <button
          className={`icon-button ${utilityPanel === 'help' ? 'selected' : ''}`}
          type="button"
          aria-label="Help"
          title="Help and quick guide"
          onClick={() => setUtilityPanel(current => (current === 'help' ? null : 'help'))}
        >
          <CircleHelp size={18} />
        </button>

        {/* Activity & Notifications */}
        <button
          className={`icon-button notification-button ${
            utilityPanel === 'notifications' ? 'selected' : ''
          }`}
          type="button"
          aria-label="Notifications"
          title="Workspace activity"
          onClick={() =>
            setUtilityPanel(current => (current === 'notifications' ? null : 'notifications'))
          }
        >
          <span /> <Activity size={18} />
        </button>

        {/* User avatar */}
        <span className="top-avatar" title={`Signed in as ${userName}`}>
          {userName[0]?.toUpperCase()}
        </span>
      </div>
    </header>
  )
}
