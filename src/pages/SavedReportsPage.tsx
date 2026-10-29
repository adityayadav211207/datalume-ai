import { useState, useMemo } from 'react'
import {
  ArrowDownToLine,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Database,
  Edit3,
  FileSpreadsheet,
  Filter,
  PieChart,
  LineChart,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { Dataset, SavedDashboard } from '../lib/types'

export function SavedReportsPage({
  dashboards,
  datasets,
  onOpen,
  onDelete,
  onRename,
  onDuplicate,
  onDownload,
}: {
  dashboards: SavedDashboard[]
  datasets: Dataset[]
  onOpen: (dashboard: SavedDashboard) => void
  onDelete: (id: string) => void
  onRename?: (id: string, newName: string) => void
  onDuplicate?: (dashboard: SavedDashboard) => void
  onDownload: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredDashboards = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return dashboards
    return dashboards.filter(d => {
      const ds = datasets.find(item => item.id === d.dataset_id)
      const dsName = ds?.name?.toLowerCase() || ''
      return d.name.toLowerCase().includes(q) || dsName.includes(q)
    })
  }, [dashboards, datasets, searchQuery])

  const handleStartRename = (dashboard: SavedDashboard) => {
    setEditingId(dashboard.id)
    setEditingName(dashboard.name)
  }

  const handleSaveRename = (id: string) => {
    if (editingName.trim() && onRename) {
      onRename(id, editingName.trim())
    }
    setEditingId(null)
  }

  const getChartIcon = (chartType?: unknown) => {
    const type = typeof chartType === 'string' ? chartType.toLowerCase() : ''
    if (type.includes('pie') || type.includes('donut')) return <PieChart size={18} />
    if (type.includes('line') || type.includes('area')) return <LineChart size={18} />
    return <BarChart3 size={18} />
  }

  return (
    <div className="settings-view saved-reports-view">
      <div className="saved-reports-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> YOUR WORK, KEPT CLOSE
          </div>
          <h1>Saved Reports</h1>
          <p>Reopen your saved visual configurations, restore filters, or export a report.</p>
        </div>
        <div className="report-actions">
          <button className="button-primary" type="button" onClick={onDownload}>
            <ArrowDownToLine size={15} /> Export current report
          </button>
        </div>
      </div>

      {dashboards.length > 0 && (
        <div className="saved-reports-toolbar">
          <div className="saved-reports-search">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search saved reports by name or dataset..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search saved reports"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="saved-reports-meta">
            <span>
              <strong>{filteredDashboards.length}</strong> of {dashboards.length} reports
            </span>
          </div>
        </div>
      )}

      {filteredDashboards.length > 0 ? (
        <div className="saved-reports-grid">
          {filteredDashboards.map(dashboard => {
            const dataset = datasets.find(item => item.id === dashboard.dataset_id)
            const chartType =
              typeof dashboard.configuration.chart_type === 'string'
                ? dashboard.configuration.chart_type
                : 'overview'
            const filterCount = dashboard.configuration.filters
              ? Object.keys(dashboard.configuration.filters as object).length
              : 0
            const isEditing = editingId === dashboard.id
            const isDeleting = deletingId === dashboard.id

            return (
              <article className="saved-report-card" key={dashboard.id}>
                <div className="report-card-header">
                  <div className="report-card-badge">
                    <span className="report-card-icon">{getChartIcon(chartType)}</span>
                    <span className="report-card-type">{chartType} view</span>
                  </div>
                  <div className="report-card-menu">
                    {onDuplicate && (
                      <button
                        type="button"
                        className="card-action-btn"
                        title="Duplicate report"
                        aria-label={`Duplicate ${dashboard.name}`}
                        onClick={() => onDuplicate(dashboard)}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {onRename && !isEditing && (
                      <button
                        type="button"
                        className="card-action-btn"
                        title="Rename report"
                        aria-label={`Rename ${dashboard.name}`}
                        onClick={() => handleStartRename(dashboard)}
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="card-action-btn delete-btn"
                      title="Delete report"
                      aria-label={`Delete ${dashboard.name}`}
                      onClick={() => setDeletingId(dashboard.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="report-card-body">
                  {isEditing ? (
                    <div className="report-card-rename-row">
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveRename(dashboard.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        className="report-rename-input"
                      />
                      <button
                        type="button"
                        className="rename-save-btn"
                        onClick={() => handleSaveRename(dashboard.id)}
                        aria-label="Save new name"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="rename-cancel-btn"
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel rename"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h3 className="report-card-title" title={dashboard.name}>
                      {dashboard.name}
                    </h3>
                  )}

                  <div className="report-card-dataset">
                    <Database size={13} />
                    <span>{dataset?.name || 'Dataset unavailable'}</span>
                  </div>

                  <div className="report-card-tags">
                    {filterCount > 0 ? (
                      <span className="report-tag filter-tag">
                        <Filter size={11} /> {filterCount} active {filterCount === 1 ? 'filter' : 'filters'}
                      </span>
                    ) : (
                      <span className="report-tag faint-tag">No filters</span>
                    )}
                    <span className="report-tag">
                      <Calendar size={11} /> Saved
                    </span>
                  </div>
                </div>

                {isDeleting ? (
                  <div className="report-delete-confirm">
                    <span>Delete report?</span>
                    <button
                      type="button"
                      className="confirm-yes-btn"
                      onClick={() => {
                        onDelete(dashboard.id)
                        setDeletingId(null)
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="confirm-no-btn"
                      onClick={() => setDeletingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="report-card-footer">
                    <button
                      className="button-primary open-report-btn"
                      type="button"
                      onClick={() => onOpen(dashboard)}
                    >
                      <span>Open Setup</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : dashboards.length > 0 ? (
        <div className="saved-empty">
          <span>
            <Search size={22} />
          </span>
          <strong>No matching reports found</strong>
          <small>Try a different search query or clear the filter.</small>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setSearchQuery('')}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="saved-empty">
          <span className="empty-icon-wrap">
            <FileSpreadsheet size={24} />
          </span>
          <strong>No saved reports yet</strong>
          <small>
            Open any dataset and click &ldquo;Save report&rdquo; in the top bar to preserve its filters
            and charts.
          </small>
          <div className="empty-tips">
            <Sparkles size={14} />
            <span>Saved reports capture all your active cross-filters, metric selections, and visual setups.</span>
          </div>
        </div>
      )}
    </div>
  )
}

