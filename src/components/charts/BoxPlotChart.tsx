import { useState } from 'react'
import { EmptyPanel } from '../EmptyPanel'
import { formatMetric } from '../../lib/formatters'

export interface BoxPlotItem {
  name: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  lowWhisker?: number
  highWhisker?: number
  outliers?: number[]
  value?: number
}

interface BoxPlotChartProps {
  data: BoxPlotItem[]
  color?: string
  emptyText?: string
}

export function BoxPlotChart({
  data,
  color = 'var(--accent)',
  emptyText = 'No boxplot distribution data available.',
}: BoxPlotChartProps) {
  const [hoveredBox, setHoveredBox] = useState<BoxPlotItem | null>(null)

  if (!data || data.length === 0) {
    return <EmptyPanel text={emptyText} />
  }

  // Calculate overall bounds across all boxes
  let overallMin = Infinity
  let overallMax = -Infinity

  for (const item of data) {
    const l = item.lowWhisker ?? item.min
    const h = item.highWhisker ?? item.max
    overallMin = Math.min(overallMin, item.min, l, ...(item.outliers || []))
    overallMax = Math.max(overallMax, item.max, h, ...(item.outliers || []))
  }

  if (overallMin === overallMax) {
    overallMin -= 1
    overallMax += 1
  }

  const padding = (overallMax - overallMin) * 0.08
  const domainMin = overallMin - padding
  const domainMax = overallMax + padding
  const domainSpan = domainMax - domainMin || 1

  const svgHeight = 280
  const svgWidth = Math.max(380, data.length * 120 + 80)
  const chartTop = 30
  const chartBottom = svgHeight - 40
  const chartHeight = chartBottom - chartTop

  const getY = (val: number) => {
    const ratio = (val - domainMin) / domainSpan
    return chartBottom - ratio * chartHeight
  }

  const boxWidth = Math.min(60, (svgWidth - 100) / data.length * 0.55)

  // Generate 5 Y-axis tick values
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(r => domainMin + r * domainSpan)

  return (
    <div className="boxplot-container" data-testid="boxplot-chart">
      <div className="boxplot-svg-wrap">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="boxplot-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines & Y Axis */}
          {ticks.map((tick, i) => {
            const y = getY(tick)
            return (
              <g key={i} className="boxplot-grid-group">
                <line
                  x1={60}
                  y1={y}
                  x2={svgWidth - 20}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 4"
                />
                <text
                  x={50}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--ink-muted)"
                  fontSize={11}
                  fontFamily="var(--font-sans)"
                >
                  {formatMetric(tick)}
                </text>
              </g>
            )
          })}

          {/* Render each box glyph */}
          {data.map((item, idx) => {
            const centerX = 80 + (idx + 0.5) * ((svgWidth - 100) / data.length)
            const lowW = item.lowWhisker ?? item.min
            const highW = item.highWhisker ?? item.max

            const yLowW = getY(lowW)
            const yHighW = getY(highW)
            const yQ1 = getY(item.q1)
            const yMedian = getY(item.median)
            const yQ3 = getY(item.q3)

            const boxH = Math.max(4, Math.abs(yQ1 - yQ3))
            const boxY = Math.min(yQ1, yQ3)

            const isHovered = hoveredBox?.name === item.name

            return (
              <g
                key={item.name}
                className={`boxplot-glyph ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredBox(item)}
                onMouseLeave={() => setHoveredBox(null)}
              >
                {/* Whisker line */}
                <line
                  x1={centerX}
                  y1={yLowW}
                  x2={centerX}
                  y2={yHighW}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />

                {/* Whisker caps */}
                <line
                  x1={centerX - boxWidth * 0.3}
                  y1={yLowW}
                  x2={centerX + boxWidth * 0.3}
                  y2={yLowW}
                  stroke={color}
                  strokeWidth={2}
                />
                <line
                  x1={centerX - boxWidth * 0.3}
                  y1={yHighW}
                  x2={centerX + boxWidth * 0.3}
                  y2={yHighW}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Box (Q1 to Q3) */}
                <rect
                  x={centerX - boxWidth / 2}
                  y={boxY}
                  width={boxWidth}
                  height={boxH}
                  rx={4}
                  fill="var(--accent-glow)"
                  stroke={color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="boxplot-rect"
                />

                {/* Median line */}
                <line
                  x1={centerX - boxWidth / 2}
                  y1={yMedian}
                  x2={centerX + boxWidth / 2}
                  y2={yMedian}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                />

                {/* Outliers */}
                {(item.outliers || []).map((val, outIdx) => {
                  const outY = getY(val)
                  return (
                    <circle
                      key={outIdx}
                      cx={centerX}
                      cy={outY}
                      r={3.5}
                      fill="var(--data-rose)"
                      stroke="var(--surface)"
                      strokeWidth={1}
                      className="boxplot-outlier"
                    >
                      <title>Outlier: {val}</title>
                    </circle>
                  )
                })}

                {/* Column Name on X axis */}
                <text
                  x={centerX}
                  y={chartBottom + 20}
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize={11}
                  fontWeight={500}
                >
                  {item.name.length > 12 ? `${item.name.slice(0, 11)}…` : item.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {hoveredBox && (
        <div className="boxplot-info-panel">
          <div className="boxplot-badge">5-Number Summary: <strong>{hoveredBox.name}</strong></div>
          <div className="boxplot-stats-grid">
            <span className="stat-item">Min: <b>{formatMetric(hoveredBox.min)}</b></span>
            <span className="stat-item">Q1 (25%): <b>{formatMetric(hoveredBox.q1)}</b></span>
            <span className="stat-item median-highlight">Median: <b>{formatMetric(hoveredBox.median)}</b></span>
            <span className="stat-item">Q3 (75%): <b>{formatMetric(hoveredBox.q3)}</b></span>
            <span className="stat-item">Max: <b>{formatMetric(hoveredBox.max)}</b></span>
            <span className="stat-item">IQR: <b>{formatMetric(hoveredBox.q3 - hoveredBox.q1)}</b></span>
            {hoveredBox.outliers && hoveredBox.outliers.length > 0 && (
              <span className="stat-item outlier-item">Outliers: <b>{hoveredBox.outliers.length}</b></span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
