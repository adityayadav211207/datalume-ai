import { useState, useMemo } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  List,
  Search,
  X,
} from 'lucide-react'
import type { Column } from '../lib/types'

interface RowDetailDrawerProps {
  row: Record<string, unknown> | null
  rowIndex: number
  totalRows: number
  columns: Column[]
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function RowDetailDrawer({
  row,
  rowIndex,
  totalRows,
  columns,
  onClose,
  onPrev,
  onNext,
}: RowDetailDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'fields' | 'json'>('fields')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copiedJson, setCopiedJson] = useState(false)

  const colTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of columns) {
      map.set(c.name, c.type)
    }
    return map
  }, [columns])

  const filteredEntries = useMemo(() => {
    if (!row) return []
    const entries = Object.entries(row)
    if (!searchTerm.trim()) return entries
    const term = searchTerm.toLowerCase()
    return entries.filter(
      ([key, val]) =>
        key.toLowerCase().includes(term) ||
        String(val ?? '').toLowerCase().includes(term)
    )
  }, [row, searchTerm])

  if (!row) return null

  const handleCopyValue = (key: string, val: unknown) => {
    const text = val === null || val === undefined ? '' : String(val)
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1800)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 1800)
  }

  return (
    <div className="drawer-overlay" onClick={onClose} data-testid="row-detail-drawer">
      <aside
        className="drawer-panel"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label={`Record #${rowIndex + 1} Details`}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-tag">ROW DETAIL</span>
            <h2>Record #{rowIndex + 1}</h2>
            <span className="drawer-meta">
              of {totalRows.toLocaleString()} rows
            </span>
          </div>

          <div className="drawer-actions">
            {onPrev && (
              <button
                type="button"
                className="drawer-nav-btn"
                onClick={onPrev}
                disabled={rowIndex <= 0}
                title="Previous record"
                aria-label="Previous record"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {onNext && (
              <button
                type="button"
                className="drawer-nav-btn"
                onClick={onNext}
                disabled={rowIndex >= totalRows - 1}
                title="Next record"
                aria-label="Next record"
              >
                <ChevronRight size={16} />
              </button>
            )}
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              title="Close drawer"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* View mode toggle & search */}
        <div className="drawer-toolbar">
          <div className="drawer-mode-tabs">
            <button
              type="button"
              className={viewMode === 'fields' ? 'active' : ''}
              onClick={() => setViewMode('fields')}
            >
              <List size={14} /> Fields ({Object.keys(row).length})
            </button>
            <button
              type="button"
              className={viewMode === 'json' ? 'active' : ''}
              onClick={() => setViewMode('json')}
            >
              <Code2 size={14} /> JSON
            </button>
          </div>

          {viewMode === 'fields' ? (
            <div className="drawer-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search keys or values..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="drawer-search-clear"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="button-secondary drawer-copy-json-btn"
              onClick={handleCopyJson}
            >
              {copiedJson ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {viewMode === 'fields' ? (
            <div className="drawer-fields-list">
              {filteredEntries.map(([key, val]) => {
                const type = colTypeMap.get(key) || typeof val
                const isNull = val === null || val === undefined || val === ''
                const isCopied = copiedKey === key

                return (
                  <div key={key} className="drawer-field-card">
                    <div className="drawer-field-head">
                      <div className="drawer-field-meta">
                        <strong className="drawer-field-name">{key}</strong>
                        <span className="drawer-type-badge">{type}</span>
                      </div>
                      <button
                        type="button"
                        className="drawer-copy-val-btn"
                        onClick={() => handleCopyValue(key, val)}
                        title="Copy field value"
                        disabled={isNull}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div className="drawer-field-value">
                      {isNull ? (
                        <span className="null-value">— (null)</span>
                      ) : typeof val === 'object' ? (
                        <pre>{JSON.stringify(val, null, 2)}</pre>
                      ) : (
                        <span>{String(val)}</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {!filteredEntries.length && (
                <div className="drawer-empty-search">
                  No fields matching "{searchTerm}"
                </div>
              )}
            </div>
          ) : (
            <div className="drawer-json-view">
              <pre>{JSON.stringify(row, null, 2)}</pre>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
