import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronRight,
  Database,
  Filter,
  Search,
  X,
} from 'lucide-react'
import type { Column, Filters, FilterSpec, RowResult } from '../lib/types'

interface DataTableProps {
  rows: RowResult | null
  columnsMeta?: Column[]
  maxRows?: number
  visibleColumns?: string[]
  density?: 'compact' | 'normal' | 'roomy'
  filters?: Filters
  onFilterChange?: (column: string, spec: FilterSpec | null) => void
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  selectedRowIndex?: number | null
}

function getColBadge(type: string): { label: string; className: string } {
  const t = (type || '').toLowerCase()
  if (['int', 'float', 'number', 'decimal', 'double'].some(x => t.includes(x))) {
    return { label: 'NUM', className: 'badge-num' }
  }
  if (['date', 'time', 'timestamp'].some(x => t.includes(x))) {
    return { label: 'DATE', className: 'badge-date' }
  }
  if (['bool'].some(x => t.includes(x))) {
    return { label: 'BOOL', className: 'badge-bool' }
  }
  return { label: 'TXT', className: 'badge-txt' }
}

export function DataTable({
  rows,
  columnsMeta = [],
  maxRows,
  visibleColumns,
  density = 'normal',
  filters = {},
  onFilterChange,
  onRowClick,
  selectedRowIndex,
}: DataTableProps) {
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null)
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null)
  const [catSearch, setCatSearch] = useState('')
  const [tempValues, setTempValues] = useState<string[]>([])
  const [tempMin, setTempMin] = useState<string>('')
  const [tempMax, setTempMax] = useState<string>('')
  const [tempStartDate, setTempStartDate] = useState<string>('')
  const [tempEndDate, setTempEndDate] = useState<string>('')

  const popoverRef = useRef<HTMLDivElement>(null)

  // Close filter popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveFilterCol(null)
      }
    }
    if (activeFilterCol) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeFilterCol])

  // Column metadata map
  const metaMap = useMemo(() => {
    const map = new Map<string, Column>()
    for (const c of columnsMeta) {
      map.set(c.name, c)
    }
    return map
  }, [columnsMeta])

  // Columns to display
  const displayColumns = useMemo(() => {
    if (!rows || !rows.columns) return []
    if (!visibleColumns || !visibleColumns.length) return rows.columns
    return rows.columns.filter(c => visibleColumns.includes(c))
  }, [rows, visibleColumns])

  // Sort rows client-side if active
  const sortedRows = useMemo(() => {
    if (!rows || !rows.rows) return []
    const list = [...rows.rows]
    if (!sort) return list

    return list.sort((left, right) => {
      const a = left[sort.column]
      const b = right[sort.column]
      if (a === null || a === undefined) return 1
      if (b === null || b === undefined) return -1
      const comparison =
        typeof a === 'number' && typeof b === 'number'
          ? a - b
          : String(a).localeCompare(String(b), undefined, { numeric: true })
      return sort.direction === 'asc' ? comparison : -comparison
    })
  }, [rows, sort])

  // Mini histogram heights for each column (5 bins: 0 - 100%)
  const miniHistMap = useMemo(() => {
    const map = new Map<string, number[]>()
    if (!rows || !rows.rows.length) return map

    for (const col of displayColumns) {
      const type = metaMap.get(col)?.type || ''
      const vals = rows.rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '')
      if (!vals.length) {
        map.set(col, [0, 0, 0, 0, 0])
        continue
      }

      const isNum =
        ['int', 'float', 'number', 'decimal'].some(t => type.toLowerCase().includes(t)) ||
        (vals.length > 0 && typeof vals[0] === 'number')

      if (isNum) {
        const numVals = vals.map(Number).filter(Number.isFinite)
        if (!numVals.length) {
          map.set(col, [0, 0, 0, 0, 0])
          continue
        }
        const min = Math.min(...numVals)
        const max = Math.max(...numVals)
        const span = max - min || 1
        const bins = [0, 0, 0, 0, 0]
        for (const v of numVals) {
          const idx = Math.min(4, Math.max(0, Math.floor(((v - min) / span) * 5)))
          bins[idx]++
        }
        const maxB = Math.max(...bins) || 1
        map.set(
          col,
          bins.map(b => (b > 0 ? Math.max(20, Math.round((b / maxB) * 100)) : 10))
        )
      } else {
        const counts = new Map<string, number>()
        for (const v of vals) {
          const s = String(v)
          counts.set(s, (counts.get(s) || 0) + 1)
        }
        const top5 = Array.from(counts.values()).sort((a, b) => b - a).slice(0, 5)
        while (top5.length < 5) top5.push(0)
        const maxB = Math.max(...top5) || 1
        map.set(
          col,
          top5.map(b => (b > 0 ? Math.max(20, Math.round((b / maxB) * 100)) : 10))
        )
      }
    }
    return map
  }, [rows, displayColumns, metaMap])

  // Unique values for current active filter column
  const activeColUniques = useMemo(() => {
    if (!activeFilterCol || !rows || !rows.rows) return []
    const set = new Set<string>()
    for (const r of rows.rows) {
      const v = r[activeFilterCol]
      if (v !== null && v !== undefined && v !== '') {
        set.add(String(v))
      }
    }
    return Array.from(set).sort()
  }, [activeFilterCol, rows])

  if (!rows || !rows.columns.length) {
    return (
      <div className="table-empty">
        <Database size={20} />
        <span>No records to show.</span>
      </div>
    )
  }

  const renderedRows = maxRows ? sortedRows.slice(0, maxRows) : sortedRows

  const openFilterPopover = (column: string) => {
    const existing = filters[column] || {}
    setActiveFilterCol(column)
    setCatSearch('')
    setTempValues(existing.values || (existing.search ? [existing.search] : []))
    setTempMin(existing.min !== undefined ? String(existing.min) : '')
    setTempMax(existing.max !== undefined ? String(existing.max) : '')
    setTempStartDate(existing.start_date || '')
    setTempEndDate(existing.end_date || '')
  }

  const applyActiveFilter = () => {
    if (!activeFilterCol || !onFilterChange) return
    const colType = metaMap.get(activeFilterCol)?.type || ''
    const isNum = ['int', 'float', 'number', 'decimal'].some(t => colType.toLowerCase().includes(t))
    const isDate = ['date', 'time', 'timestamp'].some(t => colType.toLowerCase().includes(t))

    if (isNum) {
      const min = tempMin !== '' ? Number(tempMin) : undefined
      const max = tempMax !== '' ? Number(tempMax) : undefined
      if (min === undefined && max === undefined) {
        onFilterChange(activeFilterCol, null)
      } else {
        onFilterChange(activeFilterCol, { min, max })
      }
    } else if (isDate) {
      if (!tempStartDate && !tempEndDate) {
        onFilterChange(activeFilterCol, null)
      } else {
        onFilterChange(activeFilterCol, {
          start_date: tempStartDate || undefined,
          end_date: tempEndDate || undefined,
        })
      }
    } else {
      if (!tempValues.length) {
        onFilterChange(activeFilterCol, null)
      } else {
        onFilterChange(activeFilterCol, { values: tempValues })
      }
    }
    setActiveFilterCol(null)
  }

  const clearActiveFilter = () => {
    if (!activeFilterCol || !onFilterChange) return
    onFilterChange(activeFilterCol, null)
    setActiveFilterCol(null)
  }

  return (
    <div className={`table-scroll table-density-${density}`} data-testid="data-table">
      <table>
        <thead className="table-sticky-head">
          <tr>
            <th className="row-number-th">#</th>
            {displayColumns.map(column => {
              const meta = metaMap.get(column)
              const badge = getColBadge(meta?.type || '')
              const isSorted = sort?.column === column
              const isFiltered = Boolean(filters[column])
              const miniBars = miniHistMap.get(column) || [0, 0, 0, 0, 0]

              return (
                <th key={column} className={`th-col ${isSorted ? 'th-sorted' : ''}`}>
                  <div className="th-content-stack">
                    <div className="th-top-row">
                      <button
                        type="button"
                        className="th-sort-btn"
                        onClick={() =>
                          setSort(current =>
                            current?.column === column
                              ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                              : { column, direction: 'asc' }
                          )
                        }
                        title={`Sort by ${column}`}
                      >
                        <span className="th-col-name">{column}</span>
                        <span className={`th-type-pill ${badge.className}`}>{badge.label}</span>
                        <span className="th-sort-icon">
                          {isSorted ? (
                            sort.direction === 'asc' ? (
                              <>
                                <ArrowUp size={13} />
                                <span className="th-sort-arrow-txt"> ↑</span>
                              </>
                            ) : (
                              <>
                                <ArrowDown size={13} />
                                <span className="th-sort-arrow-txt"> ↓</span>
                              </>
                            )
                          ) : (
                            <ArrowUpDown size={11} className="th-sort-faint" />
                          )}
                        </span>
                      </button>

                      {onFilterChange && (
                        <button
                          type="button"
                          className={`th-filter-btn ${isFiltered ? 'active-filter' : ''}`}
                          onClick={() => openFilterPopover(column)}
                          title={`Filter ${column}`}
                          aria-label={`Filter ${column}`}
                        >
                          <Filter size={11} />
                        </button>
                      )}
                    </div>

                    {/* Mini Histogram Sparkline */}
                    <div
                      className="th-sparkline-row"
                      title={`Distribution profile for ${column}`}
                    >
                      {miniBars.map((h, i) => (
                        <div
                          key={i}
                          className="th-mini-bar"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Filter Popover Dropdown */}
                  {activeFilterCol === column && (
                    <div className="col-filter-popover" ref={popoverRef}>
                      <div className="popover-head">
                        <strong>Filter: {column}</strong>
                        <button
                          type="button"
                          className="popover-close"
                          onClick={() => setActiveFilterCol(null)}
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {badge.label === 'NUM' ? (
                        <div className="popover-num-inputs">
                          <label>
                            <span>Min</span>
                            <input
                              type="number"
                              placeholder="Any"
                              value={tempMin}
                              onChange={e => setTempMin(e.target.value)}
                            />
                          </label>
                          <label>
                            <span>Max</span>
                            <input
                              type="number"
                              placeholder="Any"
                              value={tempMax}
                              onChange={e => setTempMax(e.target.value)}
                            />
                          </label>
                        </div>
                      ) : badge.label === 'DATE' ? (
                        <div className="popover-date-inputs">
                          <label>
                            <Calendar size={12} />
                            <span>From</span>
                            <input
                              type="date"
                              value={tempStartDate}
                              onChange={e => setTempStartDate(e.target.value)}
                            />
                          </label>
                          <label>
                            <Calendar size={12} />
                            <span>To</span>
                            <input
                              type="date"
                              value={tempEndDate}
                              onChange={e => setTempEndDate(e.target.value)}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="popover-cat-select">
                          <div className="popover-search-wrap">
                            <Search size={12} />
                            <input
                              type="text"
                              placeholder="Search categories..."
                              value={catSearch}
                              onChange={e => setCatSearch(e.target.value)}
                            />
                          </div>

                          <div className="popover-actions-quick">
                            <button
                              type="button"
                              onClick={() => setTempValues([...activeColUniques])}
                            >
                              Select all
                            </button>
                            <button type="button" onClick={() => setTempValues([])}>
                              Clear
                            </button>
                          </div>

                          <div className="popover-checkbox-list">
                            {activeColUniques
                              .filter(v => v.toLowerCase().includes(catSearch.toLowerCase()))
                              .map(val => {
                                const checked = tempValues.includes(val)
                                return (
                                  <label key={val} className="popover-checkbox-item">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setTempValues([...tempValues, val])
                                        } else {
                                          setTempValues(tempValues.filter(x => x !== val))
                                        }
                                      }}
                                    />
                                    <span className="truncate">{val}</span>
                                  </label>
                                )
                              })}
                            {!activeColUniques.length && (
                              <div className="popover-empty">No distinct values found</div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="popover-footer">
                        <button
                          type="button"
                          className="popover-clear-btn"
                          onClick={clearActiveFilter}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="button-primary popover-apply-btn"
                          onClick={applyActiveFilter}
                        >
                          <Check size={13} /> Apply
                        </button>
                      </div>
                    </div>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {renderedRows.map((row, rowIndex) => {
            const isSelected = selectedRowIndex === rowIndex
            return (
              <tr
                key={rowIndex}
                className={`table-row ${isSelected ? 'row-selected' : ''} ${
                  onRowClick ? 'row-clickable' : ''
                }`}
                onClick={() => onRowClick && onRowClick(row, rowIndex)}
              >
                <td className="row-number-td">
                  {(rows.page - 1) * rows.page_size + rowIndex + 1}
                </td>
                {displayColumns.map(column => {
                  const val = row[column]
                  const isNull = val === null || val === undefined || val === ''
                  return (
                    <td key={column} title={String(val ?? '')} className="table-td">
                      {isNull ? (
                        <span className="null-value">—</span>
                      ) : (
                        <span className="table-cell-text">{String(val)}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>

      {maxRows && rows.total > maxRows && (
        <div className="preview-more">
          Showing first {maxRows} rows on this page{' '}
          <span>
            Explore all {rows.total.toLocaleString()} records <ChevronRight size={13} />
          </span>
        </div>
      )}
    </div>
  )
}
