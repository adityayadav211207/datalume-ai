import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { EmptyPanel } from './EmptyPanel'
import { GlassCard } from './ui'
import type { Column } from '../lib/types'

export function NumericScatterPanel({
  fields,
  xValue,
  yValue,
  setXValue,
  setYValue,
  rows,
}: {
  fields: Column[]
  xValue: string
  yValue: string
  setXValue: (value: string) => void
  setYValue: (value: string) => void
  rows: { x: number; y: number }[]
}) {
  const tooltipStyle = {
    border: '1px solid var(--border-glass)',
    borderRadius: 8,
    backgroundColor: 'var(--surface-fallback)',
    color: 'var(--ink)',
    boxShadow: 'var(--shadow-panel)',
    fontSize: 11,
  }

  return (
    <GlassCard className="chart-panel" padding="md">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">NUMERIC RELATIONSHIP</div>
          <h2>
            {xValue || 'X'} vs {yValue || 'Y'}
          </h2>
        </div>
        <div className="overview-chart-controls">
          <label>
            <span>X field</span>
            <select
              aria-label="Scatter X field"
              value={xValue}
              onChange={event => setXValue(event.target.value)}
            >
              {fields.map(column => (
                <option key={column.name}>{column.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Y field</span>
            <select
              aria-label="Scatter Y field"
              value={yValue}
              onChange={event => setYValue(event.target.value)}
            >
              {fields.map(column => (
                <option key={column.name}>{column.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="chart-wrap">
        {rows.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 5" stroke="var(--border-subtle)" />
              <XAxis type="number" dataKey="x" name={xValue} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name={yValue} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} />
              <ZAxis range={[28, 28]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
              <Scatter data={rows} fill="var(--accent)" fillOpacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <EmptyPanel text="Select two numeric fields to compare their records." />
        )}
      </div>
    </GlassCard>
  )
}
