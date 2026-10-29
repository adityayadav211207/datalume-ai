import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Rows3,
  Search,
  X,
} from 'lucide-react'
import type { Dataset, Filters, FilterSpec, RowResult } from '../lib/types'
import { DataTable } from '../components/DataTable'
import { RowDetailDrawer } from '../components/RowDetailDrawer'

interface ExplorerPageProps {
  rows: RowResult | null
  dataset: Dataset
  page: number
  setPage: (page: number) => void
  tableSearch: string
  setTableSearch: (value: string) => void
  onExport: () => void
  filters?: Filters
  setFilters?: (filters: Filters) => void
  showNotice?: (msg: string) => void
}

export function ExplorerPage({
  rows,
  dataset,
  page,
  setPage,
  tableSearch,
  setTableSearch,
  onExport,
  filters = {},
  setFilters,
}: ExplorerPageProps) {
  const [density, setDensity] = useState<'compact' | 'normal' | 'roomy'>('normal')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const [colFilterSearch, setColFilterSearch] = useState('')
  const [selectedRow, setSelectedRow] = useState<{
    row: Record<string, unknown>
    index: number
  } | null>(null)

  const colMenuRef = useRef<HTMLDivElement>(null)

  const allColumns = useMemo(() => rows?.columns || [], [rows?.columns])

  // Initialize visible columns
  useEffect(() => {
    if (allColumns.length && !visibleColumns.length) {
      setVisibleColumns([...allColumns])
    }
  }, [allColumns, visibleColumns.length])

  // Outside click for columns menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(false)
      }
    }
    if (colMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [colMenuOpen])

  const handleFilterChange = (column: string, spec: FilterSpec | null) => {
    if (!setFilters) return
    const next = { ...filters }
    if (!spec) {
      delete next[column]
    } else {
      next[column] = spec
    }
    setFilters(next)
    setPage(1)
  }

  // Row drawer navigation
  const handleNavigateRow = (offset: number) => {
    if (!selectedRow || !rows || !rows.rows) return
    const nextIndex = selectedRow.index + offset
    if (nextIndex >= 0 && nextIndex < rows.rows.length) {
      setSelectedRow({
        row: rows.rows[nextIndex],
        index: nextIndex,
      })
    }
  }

  const filteredColList = allColumns.filter(c =>
    c.toLowerCase().includes(colFilterSearch.toLowerCase())
  )

  return (
    <div className="explorer-page-wrap" data-testid="explorer-page">
      {/* Explorer Top Toolbar */}
      <div className="explorer-toolbar">
        <div className="explorer-count">
          <strong>{rows?.total.toLocaleString() || 0}</strong> matching records{' '}
          <span className="count-sep">·</span> Page {page} of{' '}
          {Math.max(1, Math.ceil((rows?.total || 0) / 50))}
        </div>

        <div className="explorer-actions">
          {/* Global Search */}
          <label className="table-search">
            <Search size={14} />
            <input
              value={tableSearch}
              onChange={event => {
                setTableSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search across all records..."
            />
          </label>

          {/* Density Toggle */}
          <div className="density-toggle" role="group" aria-label="Table Density">
            <button
              type="button"
              className={density === 'compact' ? 'active' : ''}
              onClick={() => setDensity('compact')}
              title="Compact rows"
            >
              <Rows3 size={13} /> Compact
            </button>
            <button
              type="button"
              className={density === 'normal' ? 'active' : ''}
              onClick={() => setDensity('normal')}
              title="Normal rows"
            >
              Normal
            </button>
            <button
              type="button"
              className={density === 'roomy' ? 'active' : ''}
              onClick={() => setDensity('roomy')}
              title="Roomy rows"
            >
              Roomy
            </button>
          </div>

          {/* Column Show/Hide Popover */}
          <div className="col-manager-wrap" ref={colMenuRef}>
            <button
              type="button"
              className={`button-secondary col-manager-btn ${colMenuOpen ? 'active' : ''}`}
              onClick={() => setColMenuOpen(!colMenuOpen)}
              title="Configure visible columns"
            >
              <Columns3 size={14} />
              <span>
                Columns ({visibleColumns.length}/{allColumns.length})
              </span>
            </button>

            {colMenuOpen && (
              <div className="col-manager-popover">
                <div className="col-popover-head">
                  <strong>Visible Columns</strong>
                  <button
                    type="button"
                    className="col-popover-close"
                    onClick={() => setColMenuOpen(false)}
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="col-popover-search">
                  <Search size={12} />
                  <input
                    type="text"
                    placeholder="Search columns..."
                    value={colFilterSearch}
                    onChange={e => setColFilterSearch(e.target.value)}
                  />
                </div>

                <div className="col-popover-quick">
                  <button
                    type="button"
                    onClick={() => setVisibleColumns([...allColumns])}
                  >
                    Show all
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleColumns(allColumns.slice(0, 3))}
                  >
                    Reset (Top 3)
                  </button>
                </div>

                <div className="col-checkbox-list">
                  {filteredColList.map(col => {
                    const checked = visibleColumns.includes(col)
                    return (
                      <label key={col} className="col-checkbox-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            if (e.target.checked) {
                              setVisibleColumns([...visibleColumns, col])
                            } else {
                              if (visibleColumns.length > 1) {
                                setVisibleColumns(visibleColumns.filter(c => c !== col))
                              }
                            }
                          }}
                        />
                        <span className="truncate">{col}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Download CSV */}
          <button className="button-secondary" type="button" onClick={onExport}>
            <ArrowDownToLine size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Main Table Panel with Sticky Glass Header */}
      <section className="panel explorer-panel">
        <DataTable
          rows={rows}
          columnsMeta={dataset.metadata?.columns || []}
          visibleColumns={visibleColumns}
          density={density}
          filters={filters}
          onFilterChange={handleFilterChange}
          onRowClick={(row, index) => setSelectedRow({ row, index })}
          selectedRowIndex={selectedRow?.index}
        />

        {/* Pagination Bar */}
        <div className="pagination">
          <span>
            Showing {rows?.total ? (page - 1) * 50 + 1 : 0}–
            {Math.min(page * 50, rows?.total || 0)} of {rows?.total || 0} records
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <strong>{page}</strong>
            <button
              type="button"
              aria-label="Next page"
              disabled={page * 50 >= (rows?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Helper Footer Hint */}
      <div className="null-note">
        <span className="null-dot" /> Click any row to open the inspector drawer. Cells with{' '}
        <b>—</b> represent missing values.
      </div>

      {/* Slide-out Row Detail Drawer */}
      {selectedRow && (
        <RowDetailDrawer
          row={selectedRow.row}
          rowIndex={(page - 1) * 50 + selectedRow.index}
          totalRows={rows?.total || 0}
          columns={dataset.metadata?.columns || []}
          onClose={() => setSelectedRow(null)}
          onPrev={selectedRow.index > 0 ? () => handleNavigateRow(-1) : undefined}
          onNext={
            rows && selectedRow.index < rows.rows.length - 1
              ? () => handleNavigateRow(1)
              : undefined
          }
        />
      )}
    </div>
  )
}
