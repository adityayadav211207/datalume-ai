import { useState } from 'react'
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts'
import { EmptyPanel } from '../EmptyPanel'
import { formatMetric } from '../../lib/formatters'
import { CHART_COLORS } from '../../lib/constants'

interface TreemapChartProps {
  rows: { name: string; value: number }[]
  colors?: readonly string[] | string[]
  emptyText?: string
  onSelect?: (item: { name: string; value: number }) => void
}

interface TileProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  index?: number
  colors?: readonly string[] | string[]
  onSelect?: (item: { name: string; value: number }) => void
}

function TreemapTile({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  value = 0,
  index = 0,
  colors = CHART_COLORS,
  onSelect,
}: TileProps) {
  const [hovered, setHovered] = useState(false)
  if (width < 2 || height < 2) return null

  const color = colors[index % colors.length] || 'var(--accent)'
  const canShowName = width > 35 && height > 24
  const canShowVal = width > 50 && height > 40

  return (
    <g
      className={`treemap-tile ${hovered ? 'hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect && onSelect({ name, value })}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(0, width - 2)}
        height={Math.max(0, height - 2)}
        rx={5}
        fill={color}
        fillOpacity={hovered ? 0.95 : 0.78}
        stroke={hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.15)'}
        strokeWidth={hovered ? 2 : 1}
        className="treemap-rect"
      />
      {canShowName && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (canShowVal ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#ffffff"
          fontSize={Math.min(12, Math.max(9, Math.floor(width / 10)))}
          fontWeight={600}
          className="treemap-text"
        >
          {name.length > Math.floor(width / 8)
            ? `${name.slice(0, Math.max(3, Math.floor(width / 8) - 1))}…`
            : name}
        </text>
      )}
      {canShowVal && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255, 255, 255, 0.85)"
          fontSize={10}
          fontFamily="var(--font-sans)"
        >
          {formatMetric(value)}
        </text>
      )}
    </g>
  )
}

export function TreemapChart({
  rows,
  colors = CHART_COLORS,
  emptyText = 'No data available for treemap breakdown.',
  onSelect,
}: TreemapChartProps) {
  if (!rows || rows.length === 0) {
    return <EmptyPanel text={emptyText} />
  }

  // Format data for Recharts Treemap
  const treemapData = rows.map((r, i) => ({
    name: r.name,
    size: Math.max(0.001, r.value),
    value: r.value,
    index: i,
  }))

  const tooltipStyle = {
    border: '1px solid var(--border-glass)',
    borderRadius: 8,
    backgroundColor: 'var(--surface-fallback)',
    color: 'var(--ink)',
    boxShadow: 'var(--shadow-panel)',
    fontSize: 11,
  }

  return (
    <div className="treemap-chart-wrap" style={{ width: '100%', height: '100%' }} data-testid="treemap-chart">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="none"
          content={<TreemapTile colors={colors} onSelect={onSelect} />}
        >
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(val: unknown) => [formatMetric(Number(val)), 'Value']}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
