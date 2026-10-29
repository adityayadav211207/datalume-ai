import { AlertCircle } from 'lucide-react'
import type { Column } from '../lib/types'
import { GlassCard, Skeleton, EmptyState } from './ui'
import { ChartGraphic } from './ChartGraphic'

export function ChartPanel({
  title,
  kicker,
  rows,
  kind,
  emptyText,
  fields,
  value,
  onChange,
  label,
  metricFields,
  metricValue,
  onMetricChange,
  loading = false,
  error,
  colors,
  primaryColor,
  fillColor,
}: {
  title: string
  kicker: string
  rows: { name: string; value: number }[]
  kind: string
  emptyText: string
  fields: Column[]
  value: string
  onChange: (value: string) => void
  label: string
  metricFields?: Column[]
  metricValue?: string
  onMetricChange?: (value: string) => void
  loading?: boolean
  error?: string | null
  colors?: readonly string[] | string[]
  primaryColor?: string
  fillColor?: string
}) {
  return (
    <GlassCard className="chart-panel" padding="md">
      <div className="panel-heading">
        <div>
          <div className="panel-kicker">{kicker}</div>
          <h2>{title}</h2>
        </div>
        <div className="overview-chart-controls">
          {label && (
            <label>
              <span>{label}</span>
              <select
                aria-label={`${title} ${label}`}
                value={value}
                onChange={event => onChange(event.target.value)}
                disabled={loading}
              >
                {fields.map(column => (
                  <option key={column.name} value={column.name}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {metricFields && onMetricChange && (
            <label>
              <span>Metric</span>
              <select
                aria-label={`${title} metric`}
                value={metricValue}
                onChange={event => onMetricChange(event.target.value)}
                disabled={loading}
              >
                {metricFields.map(column => (
                  <option key={column.name} value={column.name}>
                    {column.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      <div className="chart-wrap" style={{ minHeight: 220 }}>
        {loading ? (
          <div className="chart-loading-skeleton" style={{ padding: '16px 8px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={170} className="w-full" />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <Skeleton height={12} width="18%" />
              <Skeleton height={12} width="22%" />
              <Skeleton height={12} width="18%" />
              <Skeleton height={12} width="20%" />
            </div>
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle size={22} className="text-rose-400" />}
            title="Chart unavailable"
            description={error}
          />
        ) : (
          <ChartGraphic
            rows={rows}
            kind={kind}
            emptyText={emptyText}
            colors={colors}
            primaryColor={primaryColor}
            fillColor={fillColor}
          />
        )}
      </div>
    </GlassCard>
  )
}

