import { useState } from 'react'
import { EmptyPanel } from '../EmptyPanel'

export interface MissingValueItem {
  name: string
  value: number // missing percentage (0 - 100)
  missing: number
  total: number
}

interface MissingValuesChartProps {
  data: MissingValueItem[]
  onSelectColumn?: (column: string) => void
  emptyText?: string
}

function getThresholdColor(pct: number): { bar: string; badge: string; text: string } {
  if (pct < 1) {
    return {
      bar: 'var(--data-emerald)',
      badge: 'rgba(16, 185, 129, 0.15)',
      text: '#10b981',
    }
  }
  if (pct <= 5) {
    return {
      bar: 'var(--data-amber)',
      badge: 'rgba(245, 158, 11, 0.15)',
      text: '#f59e0b',
    }
  }
  return {
    bar: 'var(--data-rose)',
    badge: 'rgba(244, 63, 94, 0.15)',
    text: '#f43f5e',
  }
}

export function MissingValuesChart({
  data,
  onSelectColumn,
  emptyText = 'No missing values analysis available.',
}: MissingValuesChartProps) {
  const [hoveredCol, setHoveredCol] = useState<string | null>(null)

  if (!data || data.length === 0) {
    return <EmptyPanel text={emptyText} />
  }

  const completeColumns = data.filter(d => d.missing === 0).length
  const partialColumns = data.filter(d => d.missing > 0 && d.value <= 5).length
  const criticalColumns = data.filter(d => d.value > 5).length

  return (
    <div className="missing-chart-container" data-testid="missing-values-chart">
      {/* Summary KPI Pills */}
      <div className="missing-summary-pills">
        <div className="missing-pill complete">
          <span className="pill-dot" />
          <span>&lt; 1% (Clean): <b>{completeColumns}</b></span>
        </div>
        <div className="missing-pill partial">
          <span className="pill-dot" />
          <span>1–5% (Mild): <b>{partialColumns}</b></span>
        </div>
        <div className="missing-pill critical">
          <span className="pill-dot" />
          <span>&gt; 5% (High): <b>{criticalColumns}</b></span>
        </div>
      </div>

      {/* Horizontal Bar List */}
      <div className="missing-bars-scroll">
        {data.map(item => {
          const colors = getThresholdColor(item.value)
          const isHovered = hoveredCol === item.name

          return (
            <div
              key={item.name}
              className={`missing-row ${isHovered ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredCol(item.name)}
              onMouseLeave={() => setHoveredCol(null)}
              onClick={() => onSelectColumn && onSelectColumn(item.name)}
              role="button"
              tabIndex={0}
              title={`${item.name}: ${item.missing.toLocaleString()} / ${item.total.toLocaleString()} missing (${item.value}%)`}
            >
              <div className="missing-col-label">
                <span className="missing-col-name">{item.name}</span>
                <span className="missing-col-stats">
                  {item.missing.toLocaleString()} / {item.total.toLocaleString()} rows
                </span>
              </div>

              <div className="missing-track">
                <div
                  className="missing-fill"
                  style={{
                    width: `${Math.min(100, Math.max(item.value, item.missing > 0 ? 1.5 : 0))}%`,
                    backgroundColor: colors.bar,
                  }}
                />
              </div>

              <div
                className="missing-pct-badge"
                style={{
                  backgroundColor: colors.badge,
                  color: colors.text,
                }}
              >
                {item.value.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
