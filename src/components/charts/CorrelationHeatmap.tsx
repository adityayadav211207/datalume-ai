import { useState, useMemo } from 'react'
import { EmptyPanel } from '../EmptyPanel'

export interface HeatmapItem {
  x: string
  y: string
  value: number
}

interface CorrelationHeatmapProps {
  data?: HeatmapItem[]
  correlations?: Record<string, Record<string, number | null>>
  onSelectPair?: (x: string, y: string) => void
  emptyText?: string
}

function getCorrelationColor(r: number): string {
  if (!Number.isFinite(r)) return 'rgba(255, 255, 255, 0.04)'
  const clamped = Math.max(-1, Math.min(1, r))
  if (clamped >= 0) {
    const alpha = Math.max(0.12, clamped * 0.85)
    return `rgba(56, 189, 248, ${alpha})`
  } else {
    const alpha = Math.max(0.12, Math.abs(clamped) * 0.85)
    return `rgba(244, 63, 94, ${alpha})`
  }
}

function getTextColor(r: number): string {
  if (Math.abs(r) > 0.45) return '#ffffff'
  return 'var(--ink-muted)'
}

export function CorrelationHeatmap({
  data,
  correlations,
  onSelectPair,
  emptyText = 'No correlation data available. Requires at least 2 numeric columns.',
}: CorrelationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ x: string; y: string; value: number } | null>(null)

  const { columns, matrix } = useMemo(() => {
    if (data && data.length > 0) {
      const colSet = new Set<string>()
      const map = new Map<string, number>()
      for (const item of data) {
        colSet.add(item.x)
        colSet.add(item.y)
        map.set(`${item.x}::${item.y}`, item.value)
      }
      const cols = Array.from(colSet)
      return { columns: cols, matrix: map }
    }

    if (correlations && Object.keys(correlations).length > 0) {
      const cols = Object.keys(correlations)
      const map = new Map<string, number>()
      for (const c1 of cols) {
        for (const c2 of cols) {
          const val = correlations[c1]?.[c2]
          if (val !== null && val !== undefined) {
            map.set(`${c1}::${c2}`, Number(val))
          }
        }
      }
      return { columns: cols, matrix: map }
    }

    return { columns: [], matrix: new Map<string, number>() }
  }, [data, correlations])

  if (columns.length < 2) {
    return <EmptyPanel text={emptyText} />
  }

  return (
    <div className="heatmap-container" data-testid="correlation-heatmap">
      <div className="heatmap-matrix-wrap">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-corner" aria-label="Correlation matrix corner" />
              {columns.map(col => (
                <th key={col} className="heatmap-col-header" title={col}>
                  <div className="heatmap-header-text">{col}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map(rowCol => (
              <tr key={rowCol}>
                <th className="heatmap-row-header" title={rowCol}>
                  <div className="heatmap-header-text">{rowCol}</div>
                </th>
                {columns.map(col => {
                  const val = matrix.get(`${rowCol}::${col}`) ?? 0
                  const isHovered = hoveredCell?.x === col && hoveredCell?.y === rowCol
                  const isSelf = rowCol === col

                  return (
                    <td
                      key={col}
                      className={`heatmap-cell ${isHovered ? 'hovered' : ''} ${isSelf ? 'diagonal' : ''}`}
                      style={{
                        backgroundColor: getCorrelationColor(val),
                        color: getTextColor(val),
                      }}
                      onMouseEnter={() => setHoveredCell({ x: col, y: rowCol, value: val })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onSelectPair && onSelectPair(col, rowCol)}
                      title={`${rowCol} ↔ ${col}: r = ${val >= 0 ? '+' : ''}${val.toFixed(2)}`}
                    >
                      <span className="heatmap-cell-val">
                        {val >= 0 ? '+' : ''}{val.toFixed(2)}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="heatmap-footer">
        <div className="heatmap-legend">
          <span className="legend-label">-1.0 (Negative)</span>
          <div className="heatmap-gradient-bar" />
          <span className="legend-label">+1.0 (Positive)</span>
        </div>
        {hoveredCell ? (
          <div className="heatmap-cell-tooltip">
            <strong>{hoveredCell.y}</strong> vs <strong>{hoveredCell.x}</strong>:
            <span className="tooltip-r"> r = {hoveredCell.value.toFixed(3)}</span>
            {onSelectPair && <span className="tooltip-action"> — Click to view Scatter</span>}
          </div>
        ) : (
          <div className="heatmap-cell-tooltip placeholder">
            Hover over a cell to view correlation or click to scatter plot
          </div>
        )}
      </div>
    </div>
  )
}
