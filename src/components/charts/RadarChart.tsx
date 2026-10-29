import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { EmptyPanel } from '../EmptyPanel'
import { formatMetric, formatXLabel } from '../../lib/formatters'

interface RadarChartProps {
  rows: { name: string; value: number }[]
  color?: string
  fillColor?: string
  emptyText?: string
  onSelect?: (item: { name: string; value: number }) => void
}

export function RadarChart({
  rows,
  color = 'var(--accent)',
  fillColor = 'var(--accent-glow)',
  emptyText = 'No data available for radar profile.',
  onSelect,
}: RadarChartProps) {
  if (!rows || rows.length < 3) {
    return (
      <EmptyPanel
        text={rows?.length ? 'Radar chart requires at least 3 categories to form a polygon.' : emptyText}
      />
    )
  }

  const tooltipStyle = {
    border: '1px solid var(--border-glass)',
    borderRadius: 8,
    backgroundColor: 'var(--surface-fallback)',
    color: 'var(--ink)',
    boxShadow: 'var(--shadow-panel)',
    fontSize: 11,
  }

  return (
    <div className="radar-chart-wrap" style={{ width: '100%', height: '100%' }} data-testid="radar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={rows} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
          <PolarGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={formatXLabel}
          />
          <PolarRadiusAxis
            angle={30}
            stroke="var(--ink-faint)"
            tick={{ fill: 'var(--ink-faint)', fontSize: 10 }}
            tickFormatter={val => formatMetric(Number(val))}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: unknown) => [formatMetric(Number(value)), 'Value']}
          />
          <Radar
            name="Metrics"
            dataKey="value"
            stroke={color}
            fill={fillColor}
            fillOpacity={0.6}
            onClick={dataPoint => {
              if (onSelect && dataPoint && typeof dataPoint === 'object' && 'name' in dataPoint) {
                onSelect(dataPoint as unknown as { name: string; value: number })
              }
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  )
}
