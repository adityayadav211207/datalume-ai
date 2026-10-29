import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { EmptyPanel } from './EmptyPanel'
import { CHART_COLORS } from '../lib/constants'
import { formatMetric, formatXLabel, linearRegression, normalDistribution } from '../lib/formatters'
import { CorrelationHeatmap } from './charts/CorrelationHeatmap'
import { BoxPlotChart, type BoxPlotItem } from './charts/BoxPlotChart'
import { RadarChart } from './charts/RadarChart'
import { MissingValuesChart, type MissingValueItem } from './charts/MissingValuesChart'
import { TreemapChart } from './charts/TreemapChart'

export interface ChartGraphicProps {
  rows: { name: string; value: number; [key: string]: unknown }[]
  kind: string
  emptyText: string
  colors?: readonly string[] | string[]
  primaryColor?: string
  fillColor?: string
  orientation?: 'vertical' | 'horizontal'
  curveType?: 'monotone' | 'linear'
  showTrendline?: boolean
  showNormalCurve?: boolean
  histogramMode?: 'frequency' | 'density'
  innerRadius?: string | number
  onItemClick?: (item: { name: string; value?: number; x?: unknown; y?: unknown }) => void
}

export function ChartGraphic({
  rows,
  kind,
  emptyText,
  colors,
  primaryColor,
  fillColor,
  orientation = 'vertical',
  curveType = 'monotone',
  showTrendline = false,
  showNormalCurve = false,
  histogramMode = 'frequency',
  innerRadius,
  onItemClick,
}: ChartGraphicProps) {
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null)

  const effectiveColors = colors && colors.length ? colors : CHART_COLORS
  const effectivePrimary = primaryColor || effectiveColors[0] || 'var(--accent)'
  const effectiveFill = fillColor || 'var(--accent-glow)'

  // Scatter plot calculations
  const scatterStats = useMemo(() => {
    if (kind !== 'scatter' || !rows) return null
    const valid = rows
      .filter(r => typeof r.x === 'number' && typeof r.y === 'number')
      .map(r => ({ x: Number(r.x), y: Number(r.y), name: r.name }))

    if (!valid.length) return null

    const sumX = valid.reduce((acc, p) => acc + p.x, 0)
    const sumY = valid.reduce((acc, p) => acc + p.y, 0)
    const meanX = sumX / valid.length
    const meanY = sumY / valid.length

    const reg = linearRegression(valid)
    const minX = Math.min(...valid.map(p => p.x))
    const maxX = Math.max(...valid.map(p => p.x))

    const trendPoints = [
      { x: minX, y: reg.predict(minX) },
      { x: maxX, y: reg.predict(maxX) },
    ]

    return { valid, meanX, meanY, reg, trendPoints }
  }, [rows, kind])

  // Donut total sum calculation
  const totalPieSum = useMemo(() => {
    if (!rows) return 0
    return rows.reduce((sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0), 0)
  }, [rows])

  // Histogram normal curve calculations
  const histogramProcessed = useMemo(() => {
    if (kind !== 'histogram' || !rows) return rows || []
    const totalCount = rows.reduce((acc, r) => acc + r.value, 0)
    const parsedBins = rows.map((r, i) => {
      let mid = i
      if (r.name.includes('–')) {
        const [a, b] = r.name.split('–').map(Number)
        if (!isNaN(a) && !isNaN(b)) mid = (a + b) / 2
      }
      return { ...r, mid, density: totalCount > 0 ? (r.value / totalCount) * 100 : 0 }
    })

    if (!showNormalCurve || parsedBins.length < 3) {
      return parsedBins.map(b => ({
        ...b,
        displayValue: histogramMode === 'density' ? b.density : b.value,
      }))
    }

    const mids = parsedBins.map(b => b.mid)
    const mean = mids.reduce((a, b) => a + b, 0) / mids.length
    const variance = mids.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / mids.length
    const std = Math.sqrt(variance) || 1

    const curvePoints = normalDistribution(mean, std, mids)
    const maxDensity = Math.max(...parsedBins.map(b => (histogramMode === 'density' ? b.density : b.value)))
    const maxCurveY = Math.max(...curvePoints.map(p => p.y)) || 1
    const curveScale = maxCurveY > 0 ? maxDensity / maxCurveY : 1

    return parsedBins.map((b, i) => ({
      ...b,
      displayValue: histogramMode === 'density' ? b.density : b.value,
      bellCurve: Math.round(curvePoints[i].y * curveScale * 100) / 100,
    }))
  }, [rows, kind, showNormalCurve, histogramMode])

  // Handle specialized new chart types directly
  if (kind === 'heatmap') {
    return (
      <CorrelationHeatmap
        data={rows as unknown as { x: string; y: string; value: number }[]}
        onSelectPair={(x, y) => onItemClick?.({ name: `${x} ↔ ${y}`, x, y })}
        emptyText={emptyText}
      />
    )
  }

  if (kind === 'boxplot') {
    return (
      <BoxPlotChart
        data={rows as unknown as BoxPlotItem[]}
        color={effectivePrimary}
        emptyText={emptyText}
      />
    )
  }

  if (kind === 'radar') {
    return (
      <RadarChart
        rows={rows}
        color={effectivePrimary}
        fillColor={effectiveFill}
        emptyText={emptyText}
        onSelect={onItemClick}
      />
    )
  }

  if (kind === 'missing') {
    return (
      <MissingValuesChart
        data={rows as unknown as MissingValueItem[]}
        onSelectColumn={col => onItemClick?.({ name: col })}
        emptyText={emptyText}
      />
    )
  }

  if (kind === 'treemap') {
    return (
      <TreemapChart
        rows={rows}
        colors={effectiveColors}
        emptyText={emptyText}
        onSelect={onItemClick}
      />
    )
  }

  if (!rows || !rows.length) return <EmptyPanel text={emptyText} />

  const tooltipStyle = {
    border: '1px solid var(--border-glass)',
    borderRadius: 8,
    backgroundColor: 'var(--surface-fallback)',
    color: 'var(--ink)',
    boxShadow: 'var(--shadow-panel)',
    fontSize: 11,
  }

  const isHorizontalBar = kind === 'horizontal-bar' || orientation === 'horizontal'
  const isCrowded = rows.length > 5 || rows.some(r => r.name.length > 7)
  const bottomMargin = isCrowded && !isHorizontalBar ? 28 : 4

  // Custom active shape for pie/donut
  const renderActiveShape = (props: unknown) => {
    const p = props as {
      cx: number
      cy: number
      innerRadius: number
      outerRadius: number
      startAngle: number
      endAngle: number
      fill: string
    }
    return (
      <g>
        <Sector
          cx={p.cx}
          cy={p.cy}
          innerRadius={p.innerRadius}
          outerRadius={p.outerRadius + 6}
          startAngle={p.startAngle}
          endAngle={p.endAngle}
          fill={p.fill}
          filter="drop-shadow(0 0 8px rgba(99, 102, 241, 0.45))"
        />
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {kind === 'pie' || kind === 'donut' ? (
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} formatter={(val: unknown) => [formatMetric(Number(val)), 'Value']} />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius ?? (kind === 'donut' ? '54%' : '0%')}
            outerRadius="78%"
            paddingAngle={3}
            activeIndex={activePieIndex !== null ? activePieIndex : undefined}
            activeShape={renderActiveShape}
            onMouseEnter={(_, idx) => setActivePieIndex(idx)}
            onMouseLeave={() => setActivePieIndex(null)}
            onClick={entry => onItemClick?.(entry as { name: string; value: number })}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {rows.map((item, index) => (
              <Cell key={item.name} fill={effectiveColors[index % effectiveColors.length]} />
            ))}
          </Pie>

          {/* Centered Total Display for Donut */}
          {(kind === 'donut' || innerRadius) && (
            <>
              <text
                x="50%"
                y="48%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--ink)"
                fontSize={16}
                fontWeight={700}
                fontFamily="var(--font-display)"
              >
                {activePieIndex !== null && rows[activePieIndex]
                  ? formatMetric(rows[activePieIndex].value)
                  : formatMetric(totalPieSum)}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--ink-muted)"
                fontSize={11}
              >
                {activePieIndex !== null && rows[activePieIndex]
                  ? rows[activePieIndex].name.slice(0, 14)
                  : 'Total'}
              </text>
            </>
          )}
        </PieChart>
      ) : kind === 'scatter' ? (
        <ScatterChart margin={{ top: 12, right: 16, bottom: 20, left: -4 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="var(--border-subtle)" />
          <XAxis
            type="number"
            dataKey="x"
            name="X"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={val => formatMetric(Number(val))}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Y"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={val => formatMetric(Number(val))}
          />
          <ZAxis range={[36, 36]} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: unknown, name: unknown) => [formatMetric(Number(value)), String(name)]}
          />
          {scatterStats && (
            <>
              {/* Quadrant reference lines at mean */}
              <ReferenceLine
                x={scatterStats.meanX}
                stroke="var(--ink-faint)"
                strokeDasharray="3 3"
                label={{ value: 'Mean X', fill: 'var(--ink-faint)', fontSize: 10, position: 'insideTopLeft' }}
              />
              <ReferenceLine
                y={scatterStats.meanY}
                stroke="var(--ink-faint)"
                strokeDasharray="3 3"
                label={{ value: 'Mean Y', fill: 'var(--ink-faint)', fontSize: 10, position: 'insideBottomRight' }}
              />

              {/* Data points */}
              <Scatter
                name="Points"
                data={scatterStats.valid}
                fill={effectivePrimary}
                onClick={pt => onItemClick?.(pt as { name: string; x: unknown; y: unknown })}
                style={{ cursor: onItemClick ? 'pointer' : 'default' }}
              />

              {/* Regression Trendline */}
              {showTrendline && (
                <Scatter
                  name="Trendline"
                  data={scatterStats.trendPoints}
                  line={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4 4' }}
                  shape={() => <g />}
                  legendType="none"
                />
              )}
            </>
          )}
        </ScatterChart>
      ) : kind === 'line' ? (
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border-subtle)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            interval={isCrowded ? 'preserveStartEnd' : 0}
            tickFormatter={formatXLabel}
            angle={isCrowded ? -18 : 0}
            textAnchor={isCrowded ? 'end' : 'middle'}
            height={isCrowded ? 32 : 18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={val => formatMetric(Number(val))}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(val: unknown) => [formatMetric(Number(val)), 'Value']} />
          <Line
            type={curveType}
            dataKey="value"
            stroke={effectivePrimary}
            strokeWidth={2.5}
            dot={{ r: 3, fill: effectivePrimary }}
            activeDot={{ r: 6, fill: effectivePrimary, stroke: '#ffffff', strokeWidth: 2 }}
            onClick={pt => onItemClick?.(pt as unknown as { name: string; value: number })}
          />
        </LineChart>
      ) : kind === 'area' ? (
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: bottomMargin }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={effectivePrimary} stopOpacity={0.65} />
              <stop offset="95%" stopColor={effectivePrimary} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border-subtle)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            interval={isCrowded ? 'preserveStartEnd' : 0}
            tickFormatter={formatXLabel}
            angle={isCrowded ? -18 : 0}
            textAnchor={isCrowded ? 'end' : 'middle'}
            height={isCrowded ? 32 : 18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={val => formatMetric(Number(val))}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(val: unknown) => [formatMetric(Number(val)), 'Value']} />
          <Area
            type={curveType}
            dataKey="value"
            stroke={effectivePrimary}
            fill="url(#areaGradient)"
            strokeWidth={2}
            activeDot={{ r: 6, fill: effectivePrimary, stroke: '#ffffff', strokeWidth: 2 }}
            onClick={pt => onItemClick?.(pt as unknown as { name: string; value: number })}
          />
        </AreaChart>
      ) : kind === 'histogram' ? (
        <ComposedChart data={histogramProcessed} margin={{ top: 8, right: 8, left: -18, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border-subtle)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            interval={isCrowded ? 'preserveStartEnd' : 0}
            tickFormatter={formatXLabel}
            angle={isCrowded ? -18 : 0}
            textAnchor={isCrowded ? 'end' : 'middle'}
            height={isCrowded ? 32 : 18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={val =>
              histogramMode === 'density' ? `${Number(val).toFixed(1)}%` : formatMetric(Number(val))
            }
          />
          <Tooltip
            cursor={{ fill: 'var(--accent-glow)' }}
            contentStyle={tooltipStyle}
            formatter={(val: unknown) => [
              histogramMode === 'density' ? `${Number(val).toFixed(2)}%` : formatMetric(Number(val)),
              histogramMode === 'density' ? 'Density' : 'Frequency',
            ]}
          />
          <Bar
            dataKey="displayValue"
            fill={effectivePrimary}
            radius={[5, 5, 0, 0]}
            maxBarSize={48}
            onClick={entry => onItemClick?.(entry as { name: string; value: number })}
          >
            {histogramProcessed.map((item, index) => (
              <Cell key={item.name} fill={effectiveColors[index % effectiveColors.length]} />
            ))}
          </Bar>
          {showNormalCurve && (
            <Line
              type="monotone"
              dataKey="bellCurve"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      ) : isHorizontalBar ? (
        <BarChart
          layout="vertical"
          data={rows}
          margin={{ top: 8, right: 24, left: 16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border-subtle)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={val => formatMetric(Number(val))}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            width={80}
            tickFormatter={formatXLabel}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent-glow)' }}
            contentStyle={tooltipStyle}
            formatter={(val: unknown) => [formatMetric(Number(val)), 'Value']}
          />
          <Bar
            dataKey="value"
            fill={effectivePrimary}
            radius={[0, 6, 6, 0]}
            maxBarSize={32}
            onClick={entry => onItemClick?.(entry as { name: string; value: number })}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {rows.map((item, index) => (
              <Cell key={item.name} fill={effectiveColors[index % effectiveColors.length]} />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: bottomMargin }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border-subtle)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            interval={isCrowded ? 'preserveStartEnd' : 0}
            tickFormatter={formatXLabel}
            angle={isCrowded ? -18 : 0}
            textAnchor={isCrowded ? 'end' : 'middle'}
            height={isCrowded ? 32 : 18}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
            tickFormatter={val => formatMetric(Number(val))}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent-glow)' }}
            contentStyle={tooltipStyle}
            formatter={(val: unknown) => [formatMetric(Number(val)), 'Value']}
          />
          <Bar
            dataKey="value"
            fill={effectivePrimary}
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
            onClick={entry => onItemClick?.(entry as { name: string; value: number })}
            style={{ cursor: onItemClick ? 'pointer' : 'default' }}
          >
            {colors &&
              rows.map((item, index) => (
                <Cell key={item.name} fill={effectiveColors[index % effectiveColors.length]} />
              ))}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
