import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  BarChart3,
  Bot,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  UploadCloud,
  X,
  ArrowRight,
} from 'lucide-react'
import type { Dataset } from '../lib/types'

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (page: string) => void
  datasets: Dataset[]
  onSelectDataset: (item: Dataset) => void
  savedDashboards: Array<{ id: string; name: string }>
  onAskLumi: (query: string) => void
}

interface PaletteItem {
  id: string
  category: 'Pages' | 'Datasets' | 'Reports' | 'Ask Lumi'
  title: string
  subtitle?: string
  icon: typeof LayoutDashboard
  action: () => void
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  datasets,
  onSelectDataset,
  savedDashboards,
  onAskLumi,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Build items list
  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result: PaletteItem[] = []

    // 1. Pages
    const pages = [
      { label: 'Overview', icon: LayoutDashboard },
      { label: 'Upload Dataset', icon: UploadCloud },
      { label: 'Data Explorer', icon: Database },
      { label: 'Visualizations', icon: BarChart3 },
      { label: 'AI Data Assistant', icon: Bot },
      { label: 'Saved Reports', icon: FileSpreadsheet },
      { label: 'Settings', icon: Settings },
    ]
    const matchedPages = pages.filter(p => !q || p.label.toLowerCase().includes(q))
    for (const p of matchedPages) {
      result.push({
        id: `page-${p.label}`,
        category: 'Pages',
        title: p.label,
        subtitle: 'Jump to view',
        icon: p.icon,
        action: () => {
          onNavigate(p.label)
          onClose()
        },
      })
    }

    // 2. Datasets
    const matchedDatasets = datasets.filter(d => !q || d.name.toLowerCase().includes(q))
    for (const d of matchedDatasets) {
      result.push({
        id: `dataset-${d.id}`,
        category: 'Datasets',
        title: d.name,
        subtitle: `${d.metadata.row_count.toLocaleString()} rows · ${d.metadata.columns.length} columns`,
        icon: Database,
        action: () => {
          onSelectDataset(d)
          onNavigate('Data Explorer')
          onClose()
        },
      })
    }

    // 3. Reports
    const matchedReports = savedDashboards.filter(r => !q || r.name.toLowerCase().includes(q))
    for (const r of matchedReports) {
      result.push({
        id: `report-${r.id}`,
        category: 'Reports',
        title: r.name,
        subtitle: 'Saved analysis report',
        icon: FileSpreadsheet,
        action: () => {
          onNavigate('Saved Reports')
          onClose()
        },
      })
    }

    // 4. Ask Lumi Query
    if (q) {
      result.push({
        id: 'ask-lumi',
        category: 'Ask Lumi',
        title: `Ask Lumi: "${query}"`,
        subtitle: 'Send question directly to AI data assistant',
        icon: Sparkles,
        action: () => {
          onAskLumi(query)
          onClose()
        },
      })
    }

    return result
  }, [query, datasets, savedDashboards, onNavigate, onSelectDataset, onAskLumi, onClose])

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1))
    }
  }, [items.length, selectedIndex])

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return
    const activeEl = listEl.querySelector('.cmd-item-selected') as HTMLElement | null
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Key navigation
  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(idx => (idx + 1) % (items.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(idx => (idx - 1 + items.length) % (items.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[selectedIndex]) {
        items[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!open) return null

  // Group items by category for rendering
  const categories = ['Pages', 'Datasets', 'Reports', 'Ask Lumi'] as const

  return (
    <div
      className="cmd-palette-backdrop"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="panel cmd-palette-modal"
        onKeyDown={handleKeyDown}
      >
        <div className="cmd-header">
          <Search size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="ui-icon-btn ui-icon-btn-ghost ui-icon-btn-sm"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="cmd-esc-kbd" onClick={onClose}>
            ESC
          </kbd>
        </div>

        <div className="cmd-list" ref={listRef}>
          {items.length === 0 ? (
            <div className="cmd-empty">
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <small>Try searching for a page name, dataset, or type a question for Lumi</small>
            </div>
          ) : (
            categories.map(cat => {
              const catItems = items.filter(it => it.category === cat)
              if (!catItems.length) return null

              return (
                <div key={cat} className="cmd-group">
                  <div className="cmd-group-title">{cat}</div>
                  {catItems.map(item => {
                    const idx = items.findIndex(it => it.id === item.id)
                    const isSelected = idx === selectedIndex
                    const Icon = item.icon

                    return (
                      <div
                        key={item.id}
                        role="option"
                        aria-selected={isSelected}
                        className={`cmd-item ${isSelected ? 'cmd-item-selected' : ''}`}
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <span className="cmd-item-icon">
                          <Icon size={16} />
                        </span>
                        <div className="cmd-item-text">
                          <span className="cmd-item-title">{item.title}</span>
                          {item.subtitle && <span className="cmd-item-sub">{item.subtitle}</span>}
                        </div>
                        {isSelected && <ArrowRight size={14} className="cmd-item-arrow" />}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        <div className="cmd-footer">
          <div className="cmd-keys">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> Navigate
            </span>
            <span>
              <kbd>↵</kbd> Select
            </span>
            <span>
              <kbd>ESC</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
