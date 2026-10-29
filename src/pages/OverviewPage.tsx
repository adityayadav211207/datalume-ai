import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line } from 'recharts'
import {
  Activity,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Database,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { Column, Dataset, Filters, RowResult } from '../lib/types'
import type { ApiClient } from '../lib/api'
import { formatMetric, makeKpis, countUpFrames } from '../lib/formatters'
import { useChartTheme } from '../hooks/useChartTheme'
import { GlassCard, Skeleton, Tooltip } from '../components/ui'
import { ChartPanel } from '../components/ChartPanel'
import { NumericScatterPanel } from '../components/NumericScatterPanel'
import { DataTable } from '../components/DataTable'

export interface OverviewChartState {
  chartRows: { name: string; value: number }[]
  categoryShareRows: { name: string; value: number }[]
  comparisonRows: { name: string; value: number }[]
  histogramRows: { name: string; value: number }[]
  numericScatterRows: { x: number; y: number }[]
  correlationRows: { x: string; y: string; value: number }[]
  overviewCategory: string
  shareCategory: string
  comparisonCategory: string
  comparisonMetric: string
  histogramMetric: string
  scatterXAxis: string
  scatterYAxis: string
}

function KpiCountUp({ value }: { value: number }) {
  const [displayVal, setDisplayVal] = useState<number>(() =>
    typeof value === 'number' && Number.isFinite(value) ? 0 : value
  )
  const framesRef = useRef<number[]>([])
  const frameIdxRef = useRef<number>(0)

  useEffect(() => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      setDisplayVal(value)
      return
    }
    const frames = countUpFrames(value, 20)
    framesRef.current = frames
    frameIdxRef.current = 0
    let rafId: number

    const step = () => {
      if (frameIdxRef.current < framesRef.current.length) {
        setDisplayVal(framesRef.current[frameIdxRef.current])
        frameIdxRef.current += 1
        rafId = requestAnimationFrame(step)
      } else {
        setDisplayVal(value)
      }
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [value])

  return <span>{formatMetric(displayVal)}</span>
}

function KpiSparkline({
  dataset,
  column,
  strokeColor,
}: {
  dataset: Dataset
  column: string | null
  strokeColor: string
}) {
  if (!column || !dataset.statistics?.numeric?.[column]) return null
  const stats = dataset.statistics.numeric[column]
  const min = stats.min ?? 0
  const max = stats.max ?? 0
  const mean = stats.mean ?? (min + max) / 2
  const median = stats.median ?? mean

  // Real 5-point distribution curve computed from real summary statistics
  const p25 = min + (median - min) * 0.5
  const p75 = median + (max - median) * 0.5
  const data = [
    { v: min },
    { v: p25 },
    { v: median },
    { v: p75 },
    { v: max },
  ]

  return (
    <div
      className="kpi-sparkline"
      title={`Distribution range: ${formatMetric(min)} to ${formatMetric(max)}`}
    >
      <LineChart width={52} height={22} data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={strokeColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  )
}

interface InsightChipData {
  id: string
  dotClass: 'info' | 'warning' | 'success' | 'accent' | 'neutral'
  label: string
  detail: string
}

function InsightsStrip({ dataset }: { dataset: Dataset }) {
  const chips = useMemo<InsightChipData[]>(() => {
    if (!dataset) return []
    const results: InsightChipData[] = []

    // 1. Strongest correlation
    const correlations = dataset.statistics?.correlations || {}
    const pairs = Object.entries(correlations).flatMap(([col, values]) =>
      Object.entries(values as Record<string, number | null>)
        .filter(([other, val]) => other !== col && val !== null && col < other)
        .map(([other, val]) => ({ x: col, y: other, value: Number(val) }))
    )
    pairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    if (pairs.length > 0 && pairs[0]) {
      const topCorr = pairs[0]
      results.push({
        id: 'corr',
        dotClass: 'info',
        label: `${topCorr.x} ↔ ${topCorr.y}`,
        detail: `r = ${topCorr.value.toFixed(2)} correlation`,
      })
    }

    // 2. Missing values or completeness
    const missingCols = [...(dataset.metadata?.columns || [])].filter(c => c.missing_percent > 0)
    missingCols.sort((a, b) => b.missing_percent - a.missing_percent)
    if (missingCols.length > 0 && missingCols[0]) {
      const col = missingCols[0]
      results.push({
        id: 'missing',
        dotClass: 'warning',
        label: `${col.name}`,
        detail: `${col.missing_percent}% missing (${col.missing.toLocaleString()} rows)`,
      })
    } else if (dataset.metadata?.columns?.length) {
      results.push({
        id: 'complete',
        dotClass: 'success',
        label: '100% complete',
        detail: 'No missing values across fields',
      })
    }

    // 3. Top category share
    const catStats = dataset.statistics?.categorical || {}
    let topCatShare: { col: string; val: string; pct: number } | null = null
    for (const [colName, items] of Object.entries(catStats)) {
      if (items && items.length > 0 && items[0]) {
        const topItem = items[0]
        const share = Math.round((topItem.count / Math.max(1, dataset.metadata.row_count)) * 100)
        if (!topCatShare || share > topCatShare.pct) {
          topCatShare = { col: colName, val: String(topItem.value), pct: share }
        }
      }
    }
    if (topCatShare && topCatShare.pct >= 15) {
      results.push({
        id: 'cat-share',
        dotClass: 'accent',
        label: `${topCatShare.val}`,
        detail: `${topCatShare.pct}% of ${topCatShare.col}`,
      })
    }

    // 4. Outlier-heavy / high variance column
    const numStats = dataset.statistics?.numeric || {}
    let highVariance: { col: string; cv: number } | null = null
    for (const [colName, stats] of Object.entries(numStats)) {
      if (stats.mean && stats.std && Math.abs(stats.mean) > 0.0001) {
        const cv = stats.std / Math.abs(stats.mean)
        if (cv >= 0.8 && (!highVariance || cv > highVariance.cv)) {
          highVariance = { col: colName, cv: Math.round(cv * 10) / 10 }
        }
      }
    }
    if (highVariance) {
      results.push({
        id: 'variance',
        dotClass: 'neutral',
        label: `${highVariance.col}`,
        detail: `High variance (CV = ${highVariance.cv})`,
      })
    } else if (dataset.metadata?.duplicate_rows > 0) {
      results.push({
        id: 'duplicates',
        dotClass: 'warning',
        label: `${dataset.metadata.duplicate_rows.toLocaleString()} duplicates`,
        detail: 'Duplicate rows detected',
      })
    }

    return results.slice(0, 4)
  }, [dataset])

  if (!dataset.statistics) {
    return (
      <div className="insights-strip">
        <Skeleton width={180} height={32} />
        <Skeleton width={210} height={32} />
        <Skeleton width={160} height={32} />
      </div>
    )
  }

  if (!chips.length) return null

  return (
    <div className="insights-strip" role="region" aria-label="Dataset insights">
      {chips.map(chip => (
        <div className="insight-chip" key={chip.id}>
          <span className={`insight-chip-dot ${chip.dotClass}`} />
          <span className="insight-chip-label">{chip.label}</span>
          <span className="insight-chip-detail">· {chip.detail}</span>
        </div>
      ))}
    </div>
  )
}

export function OverviewPage({
  dataset,
  columns,
  numericColumns,
  categoryColumns,
  overviewFields,
  rows,
  filters,
  api,
  showNotice,
  onNavigate,
  onStateChange,
}: {
  dataset: Dataset
  columns: Column[]
  numericColumns: Column[]
  categoryColumns: Column[]
  overviewFields: Column[]
  rows: RowResult | null
  filters: Filters
  api: ApiClient
  showNotice: (msg: string) => void
  onNavigate: (page: string) => void
  onStateChange?: (state: OverviewChartState) => void
}) {
  const chartTheme = useChartTheme()

  const [chartRows, setChartRows] = useState<{ name: string; value: number }[]>([])
  const [categoryShareRows, setCategoryShareRows] = useState<{ name: string; value: number }[]>([])
  const [comparisonRows, setComparisonRows] = useState<{ name: string; value: number }[]>([])
  const [histogramRows, setHistogramRows] = useState<{ name: string; value: number }[]>([])
  const [numericScatterRows, setNumericScatterRows] = useState<{ x: number; y: number }[]>([])
  const [correlationRows, setCorrelationRows] = useState<
    { x: string; y: string; value: number }[]
  >([])
  const [scatterXAxis, setScatterXAxis] = useState('')
  const [scatterYAxis, setScatterYAxis] = useState('')
  const [overviewCategory, setOverviewCategory] = useState('')
  const [shareCategory, setShareCategory] = useState('')
  const [comparisonCategory, setComparisonCategory] = useState('')
  const [comparisonMetric, setComparisonMetric] = useState('')
  const [histogramMetric, setHistogramMetric] = useState('')

  // Loading & error states
  const [mainLoading, setMainLoading] = useState(false)
  const [mainError, setMainError] = useState<string | null>(null)
  const [secondaryLoading, setSecondaryLoading] = useState(false)
  const [secondaryError, setSecondaryError] = useState<string | null>(null)

  // Sync state upward when changed
  useEffect(() => {
    onStateChange?.({
      chartRows,
      categoryShareRows,
      comparisonRows,
      histogramRows,
      numericScatterRows,
      correlationRows,
      overviewCategory,
      shareCategory,
      comparisonCategory,
      comparisonMetric,
      histogramMetric,
      scatterXAxis,
      scatterYAxis,
    })
  }, [
    chartRows,
    categoryShareRows,
    comparisonRows,
    histogramRows,
    numericScatterRows,
    correlationRows,
    overviewCategory,
    shareCategory,
    comparisonCategory,
    comparisonMetric,
    histogramMetric,
    scatterXAxis,
    scatterYAxis,
    onStateChange,
  ])

  // Set default column selections
  useEffect(() => {
    const cols = dataset?.metadata?.columns || []
    const num = cols.filter(column =>
      ['int', 'float', 'number'].some(type => column.type.toLowerCase().includes(type))
    )
    const cats = cols.filter(
      column =>
        !num.includes(column) &&
        column.type.toLowerCase() !== 'datetime' &&
        column.unique > 1 &&
        column.unique <= 40
    )
    const preferredCat =
      cats.find(column => /category|region|segment|product|job/i.test(column.name)) || cats[0]
    const preferredMet =
      num.find(column => /revenue|sales|profit|balance|amount|total/i.test(column.name)) || num[0]

    setOverviewCategory(current =>
      cats.some(column => column.name === current) || num.some(column => column.name === current)
        ? current
        : preferredCat?.name || preferredMet?.name || ''
    )
    setShareCategory(current =>
      cats.some(column => column.name === current) ? current : preferredCat?.name || ''
    )
    setComparisonCategory(current =>
      cats.some(column => column.name === current) ? current : preferredCat?.name || ''
    )
    setComparisonMetric(current =>
      num.some(column => column.name === current) ? current : preferredMet?.name || ''
    )
    setHistogramMetric(current =>
      num.some(column => column.name === current) ? current : preferredMet?.name || ''
    )
    setScatterXAxis(current =>
      num.some(column => column.name === current) ? current : num[0]?.name || ''
    )
    setScatterYAxis(current =>
      num.some(column => column.name === current) ? current : num[1]?.name || num[0]?.name || ''
    )
  }, [dataset?.id, dataset?.metadata?.columns?.length])

  // Overview main chart
  useEffect(() => {
    const cols = dataset?.metadata?.columns || []
    const num = cols.filter(column =>
      ['int', 'float', 'number'].some(type => column.type.toLowerCase().includes(type))
    )
    const isNum = num.some(column => column.name === overviewCategory)
    const fieldExists = cols.some(column => column.name === overviewCategory)
    if (!dataset || !fieldExists) {
      setChartRows([])
      return
    }

    setMainLoading(true)
    setMainError(null)

    api
      .request(`/api/datasets/${dataset.id}/charts`, {
        method: 'POST',
        body: JSON.stringify({
          x: overviewCategory,
          chart_type: isNum ? 'histogram' : 'bar',
          aggregation: 'count',
          filters,
          top_n: isNum ? 8 : 10,
        }),
      })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then(result => {
        setChartRows(result.data || [])
        setMainLoading(false)
      })
      .catch(error => {
        setChartRows([])
        setMainError(error.message)
        setMainLoading(false)
        showNotice(error.message)
      })
  }, [dataset?.id, dataset?.metadata?.columns?.length, overviewCategory, filters, api, showNotice])

  // Secondary charts
  useEffect(() => {
    const cols = dataset?.metadata?.columns || []
    const num = cols.filter(column =>
      ['int', 'float', 'number'].some(type => column.type.toLowerCase().includes(type))
    )
    const cats = cols.filter(
      column =>
        !num.includes(column) &&
        column.type.toLowerCase() !== 'datetime' &&
        column.unique > 1 &&
        column.unique <= 40
    )
    const category = cats.find(column => column.name === shareCategory)
    const comparisonBy = cats.find(column => column.name === comparisonCategory)
    const comparisonValue = num.find(column => column.name === comparisonMetric)
    const histogramValue = num.find(column => column.name === histogramMetric)

    if (!dataset) {
      setCategoryShareRows([])
      setComparisonRows([])
      setHistogramRows([])
      setNumericScatterRows([])
      setCorrelationRows([])
      return
    }

    setSecondaryLoading(true)
    setSecondaryError(null)

    const loadChart = async (body: Record<string, unknown>) => {
      const response = await api.request(`/api/datasets/${dataset.id}/charts`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    }

    const categoryShareRequest = category
      ? loadChart({ x: category.name, chart_type: 'pie', aggregation: 'count', filters, top_n: 8 })
      : Promise.resolve({ data: [] })

    const comparisonRequest =
      comparisonBy && comparisonValue
        ? loadChart({
            x: comparisonBy.name,
            y: comparisonValue.name,
            chart_type: 'bar',
            aggregation: 'average',
            filters,
            top_n: 8,
          })
        : Promise.resolve({ data: [] })

    const scatterRequest =
      !cats.length && num.length > 1 && scatterXAxis && scatterYAxis
        ? api
            .request(`/api/datasets/${dataset.id}/query`, {
              method: 'POST',
              body: JSON.stringify({ filters, page: 1, page_size: 500 }),
            })
            .then(response => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`)
              return response.json()
            })
        : Promise.resolve(null)

    const correlationRequest =
      !cats.length && num.length > 1
        ? api
            .request(`/api/datasets/${dataset.id}/analysis`, {
              method: 'POST',
              body: JSON.stringify({ filters }),
            })
            .then(response => {
              if (!response.ok) throw new Error(`HTTP ${response.status}`)
              return response.json()
            })
        : Promise.resolve(null)

    const histogramRequest = histogramValue
      ? loadChart({
          x: histogramValue.name,
          chart_type: 'histogram',
          aggregation: 'count',
          filters,
          top_n: 8,
        })
      : Promise.resolve({ data: [] })

    Promise.all([
      categoryShareRequest,
      comparisonRequest,
      histogramRequest,
      scatterRequest,
      correlationRequest,
    ])
      .then(([categoryShare, comparison, histogram, scatter, analysis]) => {
        setCategoryShareRows(categoryShare.data || [])
        setComparisonRows(comparison.data || [])
        setHistogramRows(histogram.data || [])
        const scatterX = scatterXAxis
        const scatterY = scatterYAxis
        setNumericScatterRows(
          scatter && scatterX && scatterY
            ? (scatter.rows || []).flatMap((row: Record<string, unknown>) => {
                const x = Number(row[scatterX])
                const y = Number(row[scatterY])
                return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : []
              })
            : []
        )
        const correlations = analysis?.statistics?.correlations || {}
        const pairs = Object.entries(correlations).flatMap(([col, values]) =>
          Object.entries(values as Record<string, number | null>)
            .filter(([other, val]) => other !== col && val !== null && col < other)
            .map(([other, val]) => ({ x: col, y: other, value: Number(val) }))
        )
        pairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        setCorrelationRows(pairs.slice(0, 8))
        setSecondaryLoading(false)
      })
      .catch(error => {
        setSecondaryError(error.message)
        setSecondaryLoading(false)
        showNotice(error.message)
      })
  }, [
    dataset?.id,
    dataset?.metadata?.columns?.length,
    shareCategory,
    comparisonCategory,
    comparisonMetric,
    histogramMetric,
    scatterXAxis,
    scatterYAxis,
    filters,
    api,
    showNotice,
  ])

  const kpis = dataset.kpis || makeKpis(dataset)

  return (
    <>
      <div className="section-label">
        <span>AT A GLANCE</span>
        <div className="section-rule" />
        <button
          className="text-button"
          type="button"
          onClick={() => onNavigate('Data Explorer')}
        >
          View data <ChevronRight size={14} />
        </button>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi, index) => (
          <motion.article
            className={`kpi-card kpi-${index}`}
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <div className="kpi-top">
              <span className="kpi-icon">
                {index === 0 ? (
                  <Database size={17} />
                ) : index === 1 ? (
                  <Activity size={17} />
                ) : index === 2 ? (
                  <BarChart3 size={17} />
                ) : (
                  <Sparkles size={17} />
                )}
              </span>
              <span className="kpi-menu">···</span>
            </div>
            <div className="kpi-value-row">
              <div className="kpi-value">
                <KpiCountUp value={kpi.value} />
              </div>
              <KpiSparkline
                dataset={dataset}
                column={kpi.column}
                strokeColor={
                  index === 0
                    ? chartTheme.accent
                    : index === 1
                      ? chartTheme.teal
                      : index === 2
                        ? chartTheme.violet
                        : chartTheme.amber
                }
              />
            </div>
            <div className="kpi-label">
              {kpi.label}
              <Tooltip content={kpi.calculation || 'Calculated statistic'} placement="top">
                <button
                  type="button"
                  className="kpi-help-btn"
                  aria-label={`Calculation details for ${kpi.label}`}
                >
                  <CircleHelp size={13} />
                </button>
              </Tooltip>
            </div>
            <div className="kpi-foot">
              {kpi.column ? `Calculated from ${kpi.column}` : 'Across the active dataset'}
            </div>
          </motion.article>
        ))}
      </div>

      {/* Insights Strip computed directly from real dataset statistics */}
      <InsightsStrip dataset={dataset} />

      <section className="dashboard-chart-grid">
        <ChartPanel
          title="Field distribution"
          kicker="RECORDS OR VALUES"
          rows={chartRows}
          kind={numericColumns.some(column => column.name === overviewCategory) ? 'histogram' : 'bar'}
          emptyText="Choose a categorical or numeric field to chart."
          fields={overviewFields}
          value={overviewCategory}
          onChange={setOverviewCategory}
          label="Field"
          loading={mainLoading}
          error={mainError}
          colors={chartTheme.colors}
        />
        {categoryColumns.length ? (
          <ChartPanel
            title="Category share"
            kicker="COMPOSITION"
            rows={categoryShareRows}
            kind="pie"
            emptyText="A categorical field is needed for this chart."
            fields={categoryColumns}
            value={shareCategory}
            onChange={setShareCategory}
            label="Category"
            loading={secondaryLoading}
            error={secondaryError}
            colors={chartTheme.colors}
          />
        ) : (
          <ChartPanel
            title="Numeric correlations"
            kicker="RELATIONSHIPS"
            rows={correlationRows.map(pair => ({ name: `${pair.x} / ${pair.y}`, value: pair.value }))}
            kind="bar"
            emptyText="At least two numeric fields are needed."
            fields={[]}
            value=""
            onChange={() => undefined}
            label=""
            loading={secondaryLoading}
            error={secondaryError}
            colors={chartTheme.colors}
          />
        )}
        {categoryColumns.length ? (
          <ChartPanel
            title="Average by category"
            kicker="GROUP COMPARISON"
            rows={comparisonRows}
            kind="bar"
            emptyText="A category and numeric column are needed."
            fields={categoryColumns}
            value={comparisonCategory}
            onChange={setComparisonCategory}
            label="Group"
            metricFields={numericColumns}
            metricValue={comparisonMetric}
            onMetricChange={setComparisonMetric}
            loading={secondaryLoading}
            error={secondaryError}
            colors={chartTheme.colors}
          />
        ) : (
          <NumericScatterPanel
            fields={numericColumns}
            xValue={scatterXAxis}
            yValue={scatterYAxis}
            setXValue={setScatterXAxis}
            setYValue={setScatterYAxis}
            rows={numericScatterRows}
          />
        )}
        <ChartPanel
          title="Numeric distribution"
          kicker="VALUE RANGE"
          rows={histogramRows}
          kind="histogram"
          emptyText="A numeric column is needed for a histogram."
          fields={numericColumns}
          value={histogramMetric}
          onChange={setHistogramMetric}
          label="Numeric field"
          loading={secondaryLoading}
          error={secondaryError}
          colors={chartTheme.colors}
        />
      </section>

      <div className="analysis-grid">
        <GlassCard className="insight-panel" padding="md">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">COMPUTED FROM YOUR DATA</div>
              <h2>Data quality</h2>
            </div>
            <span className="quality-badge">
              <ShieldCheck size={14} /> Analysis
            </span>
          </div>
          <div className="quality-score">
            <div className="quality-ring">
              <div>
                <strong>
                  {Math.max(
                    0,
                    100 -
                      Math.round(
                        (dataset.metadata?.columns || []).reduce(
                          (sum, column) => sum + column.missing_percent,
                          0
                        ) / Math.max(1, columns.length)
                      )
                  )}
                  %
                </strong>
                <small>complete</small>
              </div>
            </div>
            <div className="quality-summary">
              <strong>
                {(dataset.metadata?.columns || [])
                  .reduce((sum, column) => sum + column.missing, 0)
                  .toLocaleString()}
              </strong>
              <span>missing values</span>
              <small>
                across {columns.filter(column => column.missing > 0).length} fields
              </small>
            </div>
          </div>
          <div className="insight-list">
            {(dataset.metadata?.columns || [])
              .filter(column => column.missing > 0)
              .slice(0, 3)
              .map(column => (
                <div className="insight-row" key={column.name}>
                  <span className="insight-dot peach" />
                  <span>
                    <strong>{column.name}</strong>
                    <small>Missing values detected</small>
                  </span>
                  <b>{column.missing_percent}%</b>
                </div>
              ))}
            {dataset.metadata?.duplicate_rows > 0 && (
              <div className="insight-row">
                <span className="insight-dot yellow" />
                <span>
                  <strong>Duplicate records</strong>
                  <small>Rows match existing records</small>
                </span>
                <b>{dataset.metadata.duplicate_rows}</b>
              </div>
            )}
            {!(dataset.metadata?.columns || []).some(column => column.missing > 0) &&
              !dataset.metadata?.duplicate_rows && (
                <div className="quality-clean">
                  <Check size={15} /> No missing values or duplicate rows detected.
                </div>
              )}
          </div>
          <button
            className="panel-link"
            type="button"
            onClick={() => onNavigate('Data Explorer')}
          >
            Inspect fields <ChevronRight size={14} />
          </button>
        </GlassCard>
      </div>

      <GlassCard className="table-panel" padding="md">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">REAL-TIME DATA PREVIEW</div>
            <h2>
              Recent records <span className="heading-count">{rows?.total.toLocaleString() || 0}</span>
            </h2>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => onNavigate('Data Explorer')}
          >
            Open explorer <ChevronRight size={14} />
          </button>
        </div>
        <DataTable rows={rows} />
      </GlassCard>
    </>
  )
}
