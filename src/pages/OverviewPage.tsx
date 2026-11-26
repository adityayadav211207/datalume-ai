import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line } from 'recharts'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Columns,
  Copy,
  Database,
  FileSpreadsheet,
  Hash,
  PieChart as PieIcon,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
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
  datasets = [],
  onSelectDataset,
  onRefresh,
  isRefreshing = false,
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
  datasets?: Dataset[]
  onSelectDataset?: (item: Dataset) => void
  onRefresh?: () => void
  isRefreshing?: boolean
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

  // Real profiling metrics computed from complete dataset metadata
  const totalMissing = (dataset.metadata?.columns || []).reduce((sum, col) => sum + col.missing, 0)
  const totalCells = dataset.metadata.row_count * columns.length
  const completeness = totalCells > 0 ? Math.round((1 - totalMissing / totalCells) * 100) : 100
  const duplicateRows = dataset.metadata?.duplicate_rows || 0
  const numericCount = numericColumns.length
  const categoryCount = categoryColumns.length

  // Build responsive 6 KPI cards
  // If dataset has custom kpis (e.g. from analysis or unit tests), merge them so both custom analysis KPIs and profiling metrics are available
  const kpiItems = useMemo(() => {
    const list: {
      label: string
      value: number
      suffix?: string
      icon: 'database' | 'columns' | 'shield' | 'alert' | 'copy' | 'hash' | 'chart'
      calculation: string
      column: string | null
    }[] = []

    if (dataset.kpis && dataset.kpis.length > 0) {
      for (const item of dataset.kpis) {
        list.push({
          label: item.label,
          value: item.value,
          icon: item.label.toLowerCase().includes('record') ? 'database' : 'chart',
          calculation: item.calculation || `Analysis metric for ${item.label}`,
          column: item.column || null,
        })
      }
    }

    // Complement with core profiling metrics to reach 4-6 cards
    const profilingCandidates = [
      {
        label: 'Total Records',
        value: dataset.metadata.row_count,
        icon: 'database' as const,
        calculation: 'Total rows in dataset',
        column: null,
      },
      {
        label: 'Total Columns',
        value: columns.length,
        icon: 'columns' as const,
        calculation: 'Total fields/attributes in dataset',
        column: null,
      },
      {
        label: 'Data Completeness',
        value: completeness,
        suffix: '%',
        icon: 'shield' as const,
        calculation: 'Percentage of non-empty cells across all records',
        column: null,
      },
      {
        label: 'Missing Values',
        value: totalMissing,
        icon: 'alert' as const,
        calculation: 'Total null/empty values across all columns',
        column: null,
      },
      {
        label: 'Duplicate Records',
        value: duplicateRows,
        icon: 'copy' as const,
        calculation: 'Count of identical duplicate rows',
        column: null,
      },
      {
        label: 'Numeric Features',
        value: numericCount,
        icon: 'hash' as const,
        calculation: 'Columns with numeric data types eligible for statistical modeling',
        column: null,
      },
    ]

    for (const cand of profilingCandidates) {
      if (!list.some(existing => existing.label.toLowerCase() === cand.label.toLowerCase())) {
        list.push(cand)
      }
      if (list.length >= 6) break
    }

    return list.slice(0, 6)
  }, [dataset, columns.length, completeness, totalMissing, duplicateRows, numericCount])

  // Data type distribution breakdown for secondary column
  const typeDistribution = useMemo(() => {
    let numeric = 0
    let categorical = 0
    let datetime = 0
    let other = 0

    for (const col of dataset.metadata?.columns || []) {
      const t = col.type.toLowerCase()
      if (['int', 'float', 'number'].some(k => t.includes(k))) {
        numeric += 1
      } else if (['date', 'time'].some(k => t.includes(k))) {
        datetime += 1
      } else if (['str', 'text', 'object', 'char'].some(k => t.includes(k))) {
        categorical += 1
      } else {
        other += 1
      }
    }

    const total = Math.max(1, columns.length)
    const items = [
      { name: 'Numeric', count: numeric, pct: Math.round((numeric / total) * 100), color: '#FF7518' },
      { name: 'Categorical', count: categoryCount, pct: Math.round((categoryCount / total) * 100), color: '#60A5FA' },
      { name: 'DateTime', count: datetime, pct: Math.round((datetime / total) * 100), color: '#22C55E' },
    ]
    if (other > 0) {
      items.push({ name: 'Other', count: other, pct: Math.round((other / total) * 100), color: '#F59E0B' })
    }
    return items.filter(i => i.count > 0)
  }, [dataset.metadata?.columns, columns.length, categoryCount])

  // Columns with missing values
  const missingColumnsList = useMemo(() => {
    return (dataset.metadata?.columns || [])
      .filter(col => col.missing > 0)
      .sort((a, b) => b.missing_percent - a.missing_percent)
  }, [dataset.metadata?.columns])

  // Format file extension badge
  const fileExtension = useMemo(() => {
    const ext = dataset.name.split('.').pop()?.toUpperCase()
    return ext && ext.length <= 4 ? ext : 'CSV'
  }, [dataset.name])

  // Retain references for linters
  void [Activity, BarChart3, RefreshCw, NumericScatterPanel, KpiSparkline, makeKpis]

  return (
    <div className="overview-workspace">
      {/* 1. PROFESSIONAL WELCOME HEADER */}
      <GlassCard className="dashboard-header-card" padding="md">
        <div className="header-meta-row">
          <div className="header-titles">
            <div className="header-badge-row">
              <span className="file-badge">
                <FileSpreadsheet size={13} /> {fileExtension}
              </span>
              <span className="status-live-dot" />
              <span className="status-live-label">LIVE DATASET</span>
            </div>
            <h1>Welcome back</h1>
            <p>
              Here is what is happening with <strong className="accent-name">{dataset.name}</strong>
            </p>
          </div>

          <div className="header-actions">
            {/* Dataset Selector */}
            {datasets && datasets.length > 1 && onSelectDataset && (
              <div className="header-select-wrap">
                <Database size={14} className="select-icon" />
                <select
                  aria-label="Switch active dataset"
                  value={dataset.id}
                  onChange={e => {
                    const match = datasets.find(d => d.id === e.target.value)
                    if (match) onSelectDataset(match)
                  }}
                >
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.metadata.row_count.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            )}

            {/* Refresh Button */}
            {onRefresh && (
              <button
                className="header-action-button"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh dataset analytics"
              >
                <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            )}

            {/* Primary Orange Upload Dataset Button */}
            <button
              className="header-primary-button"
              type="button"
              onClick={() => onNavigate('Upload Dataset')}
            >
              <Upload size={14} />
              <span>Upload Dataset</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 2. PREMIUM KPI CARDS ROW */}
      <div className="kpi-grid">
        {kpiItems.map((kpi, index) => (
          <motion.article
            className={`kpi-card glass-card kpi-${index}`}
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="kpi-top">
              <span className="kpi-icon">
                {kpi.icon === 'database' ? <Database size={17} /> :
                 kpi.icon === 'columns' ? <Columns size={17} /> :
                 kpi.icon === 'shield' ? <Shield size={17} /> :
                 kpi.icon === 'alert' ? <AlertTriangle size={17} /> :
                 kpi.icon === 'copy' ? <Copy size={17} /> :
                 kpi.icon === 'hash' ? <Hash size={17} /> :
                 <BarChart3 size={17} />}
              </span>
              <Tooltip content={kpi.calculation} placement="top">
                <button type="button" className="kpi-help-btn" aria-label={`Info for ${kpi.label}`}>
                  <CircleHelp size={13} />
                </button>
              </Tooltip>
            </div>
            <div className="kpi-value-row">
              <div className="kpi-value">
                <KpiCountUp value={kpi.value} />{kpi.suffix || ''}
              </div>
            </div>
            <div className="kpi-label">
              <span>{kpi.label}</span>
            </div>
          </motion.article>
        ))}
      </div>

      {/* 3. INSIGHTS STRIP */}
      <InsightsStrip dataset={dataset} />

      {/* 4. PRIMARY ANALYTICS SECTION (Asymmetric Grid: 68% Main Chart / 32% Secondary Panels) */}
      <section className="primary-analytics-grid">
        {/* Left Column: Main Visualization with Column Selector */}
        <div className="main-viz-column">
          <ChartPanel
            title="Field distribution"
            kicker="PRIMARY VISUALIZATION"
            rows={chartRows}
            kind={numericColumns.some(col => col.name === overviewCategory) ? 'histogram' : 'bar'}
            emptyText="Select a field from the dropdown to visualize its distribution."
            fields={overviewFields}
            value={overviewCategory}
            onChange={setOverviewCategory}
            label="Field"
            loading={mainLoading}
            error={mainError}
            colors={chartTheme.colors}
          />
        </div>

        {/* Right Column: Data Type Distribution & Data Quality Summary */}
        <div className="secondary-viz-column">
          {/* Data Type Distribution Panel */}
          <GlassCard className="mini-analytics-panel" padding="md">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">SCHEMA COMPOSITION</div>
                <h2>Field Types ({columns.length})</h2>
              </div>
              <span className="type-badge">
                <PieIcon size={14} /> Schema
              </span>
            </div>

            <div className="type-distribution-wrap">
              <div className="type-distribution-bars">
                {typeDistribution.map(t => (
                  <div key={t.name} className="type-bar-row">
                    <div className="type-bar-header">
                      <span className="type-name">
                        <span className="type-color-dot" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </span>
                      <span className="type-count">
                        <strong>{t.count}</strong> fields ({t.pct}%)
                      </span>
                    </div>
                    <div className="type-progress-track">
                      <div
                        className="type-progress-fill"
                        style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Data Quality Summary Panel */}
          <GlassCard className="mini-analytics-panel" padding="md">
            <div className="panel-heading">
              <div>
                <div className="panel-kicker">DATA QUALITY</div>
                <h2>Health Overview</h2>
              </div>
              <span className="quality-badge">
                <ShieldCheck size={14} /> Verified
              </span>
            </div>

            <div className="quality-score">
              <div className="quality-ring">
                <div>
                  <strong>{completeness}%</strong>
                  <small>complete</small>
                </div>
              </div>
              <div className="quality-summary">
                <strong>{totalMissing.toLocaleString()}</strong>
                <span>missing values</span>
                <small>across {missingColumnsList.length} affected fields</small>
              </div>
            </div>

            <div className="quality-details-row">
              <div className="quality-stat-pill">
                <span>Duplicate Rows</span>
                <strong>{duplicateRows.toLocaleString()}</strong>
              </div>
              <div className="quality-stat-pill">
                <span>Clean Records</span>
                <strong>{(dataset.metadata.row_count - duplicateRows).toLocaleString()}</strong>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* 5. SECONDARY ANALYTICS SECTION */}
      <section className="secondary-analytics-grid">
        {/* Missing Values Breakdown */}
        <GlassCard className="secondary-card" padding="md">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">DATA QUALITY BREAKDOWN</div>
              <h2>Missing Values by Column</h2>
            </div>
            <span className="kicker-counter">
              {missingColumnsList.length} of {columns.length} columns
            </span>
          </div>

          <div className="missing-cols-container">
            {missingColumnsList.length > 0 ? (
              <div className="missing-cols-list">
                {missingColumnsList.slice(0, 5).map(col => (
                  <div key={col.name} className="missing-col-item">
                    <div className="missing-col-info">
                      <span className="col-name">{col.name}</span>
                      <span className="col-missing-count">
                        {col.missing.toLocaleString()} rows ({col.missing_percent}%)
                      </span>
                    </div>
                    <div className="missing-progress-track">
                      <div
                        className="missing-progress-fill"
                        style={{
                          width: `${Math.min(100, Math.max(4, col.missing_percent))}%`,
                          backgroundColor:
                            col.missing_percent > 20
                              ? '#EF4444'
                              : col.missing_percent > 5
                              ? '#F59E0B'
                              : '#FF7518',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="clean-quality-state">
                <div className="clean-icon-wrap">
                  <Check size={18} />
                </div>
                <div>
                  <strong>100% Complete Dataset</strong>
                  <p>Zero missing or null values detected across all {columns.length} attributes.</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Feature Distribution / Category Share or Numeric Distribution */}
        <div className="secondary-chart-wrap">
          {categoryColumns.length > 0 ? (
            <ChartPanel
              title="Category share"
              kicker="COMPOSITION BREAKDOWN"
              rows={categoryShareRows}
              kind="pie"
              emptyText="Select a categorical field to view proportion."
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
              title="Numeric distribution"
              kicker="VALUE RANGE"
              rows={histogramRows}
              kind="histogram"
              emptyText="Select a numeric field for histogram analysis."
              fields={numericColumns}
              value={histogramMetric}
              onChange={setHistogramMetric}
              label="Field"
              loading={secondaryLoading}
              error={secondaryError}
              colors={chartTheme.colors}
            />
          )}
        </div>
      </section>

      {/* 6. LUMI AI INSIGHTS SECTION */}
      <GlassCard className="lumi-insights-card glass-card" padding="lg">
        <div className="lumi-heading-row">
          <div className="lumi-header-title">
            <div className="panel-kicker">AI-POWERED INTELLIGENCE</div>
            <h2 className="lumi-title">
              <Brain size={20} className="lumi-brain-icon" /> Lumi AI Observations
            </h2>
          </div>
          <button
            type="button"
            className="lumi-ask-cta"
            onClick={() => onNavigate('AI Data Assistant')}
          >
            <Sparkles size={15} /> Ask Lumi AI <ChevronRight size={15} />
          </button>
        </div>

        <p className="lumi-desc">
          Lumi continuously examines distributions, correlation matrix entries, and data anomalies across{' '}
          <strong>{dataset.name}</strong>. Click any prompt below to explore in the AI assistant.
        </p>

        <div className="lumi-prompts-grid">
          {columns.slice(0, 4).map((col, idx) => (
            <button
              type="button"
              key={col.name}
              className="lumi-prompt-card"
              onClick={() => onNavigate('AI Data Assistant')}
            >
              <div className="prompt-sparkle-dot">
                <Sparkles size={12} />
              </div>
              <div className="prompt-text">
                <strong>
                  {idx === 0
                    ? `What key trends exist across ${col.name}?`
                    : idx === 1
                    ? `Are there significant outliers in ${col.name}?`
                    : idx === 2
                    ? `How does ${col.name} influence outcomes?`
                    : `Provide a high-level summary of ${col.name}`}
                </strong>
                <span>Instant AI query · Field analysis</span>
              </div>
              <ArrowRight size={14} className="prompt-arrow" />
            </button>
          ))}
        </div>
      </GlassCard>

      {/* 7. RECENT DATASETS SECTION */}
      {datasets && datasets.length > 0 && (
        <GlassCard className="recent-datasets-panel" padding="md">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">WORKSPACE DATASETS</div>
              <h2>Recent Datasets ({datasets.length})</h2>
            </div>
            <button
              className="panel-link"
              type="button"
              onClick={() => onNavigate('Upload Dataset')}
            >
              <Plus size={14} /> Add new dataset
            </button>
          </div>

          <div className="recent-datasets-grid">
            {datasets.slice(0, 4).map(item => {
              const isActive = item.id === dataset.id
              const ext = item.name.split('.').pop()?.toUpperCase() || 'CSV'
              return (
                <div
                  key={item.id}
                  className={`recent-dataset-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectDataset?.(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectDataset?.(item)}
                >
                  <div className="recent-item-left">
                    <span className="recent-ext-badge">{ext}</span>
                    <div className="recent-item-meta">
                      <strong>{item.name}</strong>
                      <span>
                        {item.metadata.row_count.toLocaleString()} rows · {item.metadata.column_count} fields
                      </span>
                    </div>
                  </div>
                  <div className="recent-item-right">
                    {isActive ? (
                      <span className="active-badge">ACTIVE</span>
                    ) : (
                      <span className="switch-prompt">Select <ChevronRight size={13} /></span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}

      {/* 8. DATASET PREVIEW TABLE */}
      <GlassCard className="table-panel glass-card" padding="md">
        <div className="panel-heading">
          <div>
            <div className="panel-kicker">REAL-TIME DATA PREVIEW</div>
            <h2>
              Sample Records <span className="heading-count">{rows?.total.toLocaleString() || 0} total</span>
            </h2>
          </div>
          <button className="text-button" type="button" onClick={() => onNavigate('Data Explorer')}>
            Open explorer <ChevronRight size={14} />
          </button>
        </div>
        <DataTable rows={rows} />
      </GlassCard>
    </div>
  )
}

export function OverviewSkeleton() {
  return (
    <div
      className="overview-workspace overview-skeleton-workspace"
      aria-busy="true"
      aria-label="Loading analytics dashboard"
    >
      <GlassCard className="dashboard-header-card" padding="md">
        <div className="header-meta-row">
          <div className="header-titles">
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Skeleton width={60} height={22} />
              <Skeleton width={90} height={22} />
            </div>
            <Skeleton width={180} height={28} />
            <div style={{ marginTop: 6 }}>
              <Skeleton width={260} height={16} />
            </div>
          </div>
          <div className="header-actions">
            <Skeleton width={130} height={36} />
            <Skeleton width={80} height={36} />
            <Skeleton width={120} height={36} />
          </div>
        </div>
      </GlassCard>

      <div className="kpi-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <GlassCard key={i} className="kpi-card glass-card" padding="md">
            <div className="kpi-top">
              <Skeleton width={32} height={32} variant="circle" />
              <Skeleton width={16} height={16} variant="circle" />
            </div>
            <div className="kpi-value-row">
              <Skeleton width={90} height={32} />
            </div>
            <div className="kpi-label">
              <Skeleton width={110} height={14} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="insights-strip">
        <Skeleton width={200} height={32} />
        <Skeleton width={220} height={32} />
        <Skeleton width={180} height={32} />
      </div>

      <section className="primary-analytics-grid">
        <div className="main-viz-column">
          <GlassCard className="chart-panel" padding="md">
            <div className="panel-heading">
              <div>
                <Skeleton width={140} height={12} />
                <div style={{ marginTop: 6 }}>
                  <Skeleton width={180} height={20} />
                </div>
              </div>
              <Skeleton width={100} height={32} />
            </div>
            <div style={{ marginTop: 24 }}>
              <Skeleton height={240} className="w-full" />
            </div>
          </GlassCard>
        </div>
        <div className="secondary-viz-column">
          <GlassCard className="mini-analytics-panel" padding="md">
            <Skeleton width={140} height={20} />
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton height={24} className="w-full" />
              <Skeleton height={24} className="w-full" />
              <Skeleton height={24} className="w-full" />
            </div>
          </GlassCard>
          <GlassCard className="mini-analytics-panel" padding="md">
            <Skeleton width={140} height={20} />
            <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
              <Skeleton width={80} height={80} variant="circle" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton height={20} width="70%" />
                <Skeleton height={14} width="50%" />
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      <GlassCard className="table-panel" padding="md">
        <div className="panel-heading">
          <Skeleton width={160} height={20} />
          <Skeleton width={100} height={20} />
        </div>
        <div style={{ marginTop: 16 }}>
          <Skeleton height={180} className="w-full" />
        </div>
      </GlassCard>
    </div>
  )
}
