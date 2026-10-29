import { useState } from 'react'
import { ChevronDown, Filter, X } from 'lucide-react'
import type { Column, Filters } from '../lib/types'

export function FilterBar({
  columns,
  numericColumns,
  filters,
  setFilters,
  filtered,
}: {
  columns: Column[]
  numericColumns: Column[]
  filters: Filters
  setFilters: (filters: Filters) => void
  filtered: boolean
}) {
  const [open, setOpen] = useState(false)
  const filterable = columns.filter(column => column.unique > 1 && column.unique <= 40)

  return (
    <section className={`filter-bar ${filtered ? 'filtering' : ''}`}>
      <button className="filter-toggle" type="button" onClick={() => setOpen(!open)}>
        <Filter size={15} />
        <strong>Filters</strong>
        {filtered && <span className="filter-count">{Object.keys(filters).length}</span>}
        <ChevronDown size={14} className={open ? 'rotate' : ''} />
      </button>
      {filtered ? (
        <div className="filter-chips">
          {Object.entries(filters).map(([column, spec]) => (
            <button
              type="button"
              className={`filter-chip ${spec.search ? 'chart-filter-badge' : ''}`}
              key={column}
              onClick={() => {
                const next = { ...filters }
                delete next[column]
                setFilters(next)
              }}
              title="Click to remove filter"
            >
              <span className="filter-chip-text">
                {spec.search
                  ? `Filtered by chart: ${column} = ${spec.search}`
                  : `${column}: ${spec.min ?? 'Any'} – ${spec.max ?? 'Any'}`}
              </span>
              <X size={12} />
            </button>
          ))}
          <button type="button" className="clear-filters" onClick={() => setFilters({})}>
            Clear all
          </button>
        </div>
      ) : (
        <span className="filter-hint">All records included</span>
      )}
      {open && (
        <div className="filter-popover">
          <div className="filter-popover-head">
            <strong>Filter your data</strong>
            <button type="button" onClick={() => setOpen(false)}>
              <X size={15} />
            </button>
          </div>
          {filterable.map(column => (
            <label className="filter-field" key={column.name}>
              <span>{column.name}</span>
              {numericColumns.some(item => item.name === column.name) ? (
                <span className="range-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters[column.name]?.min ?? ''}
                    onChange={event =>
                      setFilters({
                        ...filters,
                        [column.name]: {
                          ...filters[column.name],
                          min: event.target.value === '' ? undefined : Number(event.target.value),
                        },
                      })
                    }
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters[column.name]?.max ?? ''}
                    onChange={event =>
                      setFilters({
                        ...filters,
                        [column.name]: {
                          ...filters[column.name],
                          max: event.target.value === '' ? undefined : Number(event.target.value),
                        },
                      })
                    }
                  />
                </span>
              ) : (
                <input
                  placeholder={`Search ${column.name}`}
                  value={filters[column.name]?.search || ''}
                  onChange={event =>
                    setFilters({
                      ...filters,
                      [column.name]: {
                        ...filters[column.name],
                        search: event.target.value || undefined,
                      },
                    })
                  }
                />
              )}
            </label>
          ))}
          {!filterable.length && (
            <div className="filter-empty">No filterable columns were detected.</div>
          )}
        </div>
      )}
    </section>
  )
}
