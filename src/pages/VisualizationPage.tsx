import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  Award,
  BarChart3,
  BookmarkPlus,
  Layers,
  LoaderCircle,
  Maximize2,
  Sparkles,
  Split,
  TrendingUp,
} from 'lucide-react'
import type { ChartType, Column, Dataset, PaletteKey } from '../lib/types'
import { COLOR_PALETTES } from '../lib/constants'
import { ChartGraphic } from '../components/ChartGraphic'

interface VisualizationPageProps {
  dataset: Dataset | null
  columns: Column[]
  numericColumns: Column[]
  categoryColumns: Column[]
  filters: Record<string, { min?: number; max?: number; search?: string }>
  onCrossFilter?: (column: string, value: string) => void
  request: (path: string, init?: RequestInit) => Promise<Response>
  showNotice: (text: string) => void
}

export function VisualizationPage({
  dataset,
  columns,
  numericColumns,
  categoryColumns,
  filters,
  onCrossFilter,
  request,
  showNotice,
}: VisualizationPageProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [xColumn, setXColumn] = useState('')
  const [yColumn, setYColumn] = useState('')
  const [aggregation, setAggregation] = useState('count')
  const [topN, setTopN] = useState(10)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc')
  const [paletteKey, setPaletteKey] = useState<PaletteKey>('sunset')
  const [viewMode, setViewMode] = useState<'dual' | 'focus'>('dual')
  const [chartRows, setChartRows] = useState<{ name: string; value: number; [key: string]: unknown }[]>([])
  const [loading, setLoading] = useState(false)
  const [savingDashboard, setSavingDashboard] = useState(false)
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null)

  // Chart-specific advanced controls
  const [curveType, setCurveType] = useState<'monotone' | 'linear'>('monotone')
  const [barOrientation, setBarOrientation] = useState<'vertical' | 'horizontal'>('vertical')
  const [showTrendline, setShowTrendline] = useState(true)
  const [showNormalCurve, setShowNormalCurve] = useState(false)
  const [histogramMode, setHistogramMode] = useState<'frequency' | 'density'>('frequency')
  const [histogramBins, setHistogramBins] = useState(12)

  // Initialize or adjust xColumn based on chart type requirements
  useEffect(() => {
    if (!columns.length) return

    if (chartType === 'histogram' || chartType === 'boxplot') {
      if (!numericColumns.some(c => c.name === xColumn)) {
        if (numericColumns.length) setXColumn(numericColumns[0].name)
      }
    } else if (chartType === 'scatter') {
      if (!numericColumns.some(c => c.name === xColumn)) {
        if (numericColumns.length) setXColumn(numericColumns[0].name)
      }
      if (!numericColumns.some(c => c.name === yColumn)) {
        if (numericColumns.length > 1) {
          setYColumn(numericColumns[1].name)
        } else if (numericColumns.length === 1) {
          setYColumn(numericColumns[0].name)
        }
      }
    } else if (!xColumn) {
      if (categoryColumns.length) {
        setXColumn(categoryColumns[0].name)
      } else {
        setXColumn(columns[0].name)
      }
    }
  }, [columns, categoryColumns, numericColumns, chartType, xColumn, yColumn])

  // Fetch chart data from backend
  useEffect(() => {
    if (!dataset) return

    // Special chart types that don't need xColumn
    if (chartType === 'heatmap' || chartType === 'missing') {
      setLoading(true)
      request(`/api/datasets/${dataset.id}/charts`, {
        method: 'POST',
        body: JSON.stringify({
          x: columns[0]?.name || 'default',
          y: null,
          chart_type: chartType,
          aggregation: 'count',
          top_n: 50,
          filters,
        }),
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(result => {
          setChartRows(result.data || [])
        })
        .catch(err => {
          setChartRows([])
          showNotice(err.message)
        })
        .finally(() => setLoading(false))
      return
    }

    if (!xColumn) return

    if ((chartType === 'histogram' || chartType === 'boxplot') && !numericColumns.some(c => c.name === xColumn)) {
      return
    }

    if (chartType === 'scatter') {
      if (!yColumn || !numericColumns.some(c => c.name === yColumn)) return
    }

    setLoading(true)
    const isHistogram = chartType === 'histogram'
    const isCount = aggregation === 'count' || isHistogram || chartType === 'boxplot'
    const yVal = isCount ? null : yColumn || null
    const effectiveAgg = isHistogram ? 'count' : aggregation

    let backendChartType = chartType
    if (chartType === 'horizontal-bar') backendChartType = 'horizontal-bar'
    if (chartType === 'donut') backendChartType = 'donut'

    const effectiveTopN = chartType === 'histogram' ? histogramBins : topN

    request(`/api/datasets/${dataset.id}/charts`, {
      method: 'POST',
      body: JSON.stringify({
        x: xColumn,
        y: yVal,
        chart_type: backendChartType,
        aggregation: effectiveAgg,
        top_n: effectiveTopN,
        filters,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(result => {
        setChartRows(result.data || [])
      })
      .catch(err => {
        setChartRows([])
        showNotice(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [
    dataset?.id,
    xColumn,
    yColumn,
    aggregation,
    chartType,
    topN,
    histogramBins,
    filters,
    request,
    numericColumns,
    columns,
    dataset,
    showNotice,
  ])

  // Sorting and row calculations
  const displayRows = useMemo(() => {
    const list = [...chartRows]
    if (chartType === 'histogram' || chartType === 'scatter' || chartType === 'heatmap' || chartType === 'boxplot') {
      return list
    }
    if (sortOrder === 'desc') return list.sort((a, b) => b.value - a.value)
    if (sortOrder === 'asc') return list.sort((a, b) => a.value - b.value)
    if (sortOrder === 'alpha') return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    return list
  }, [chartRows, sortOrder, chartType])

  const secondaryHistogramRows = useMemo(() => {
    let running = 0
    return displayRows.map(item => {
      running += item.value
      return { name: item.name, value: running }
    })
  }, [displayRows])

  const totalPlotted = useMemo(() => {
    if (chartType === 'scatter' || chartType === 'heatmap' || chartType === 'boxplot') {
      return displayRows.length
    }
    return displayRows.reduce((sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0), 0)
  }, [displayRows, chartType])

  const averagePlotted = useMemo(
    () => (displayRows.length && totalPlotted > 0 ? Math.round((totalPlotted / displayRows.length) * 10) / 10 : 0),
    [displayRows, totalPlotted]
  )

  const peakItem = useMemo(() => {
    if (!displayRows.length || chartType === 'heatmap') return null
    return displayRows.reduce((max, r) => (r.value > max.value ? r : max), displayRows[0])
  }, [displayRows, chartType])

  const activePalette = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.sunset

  // Dual View Configuration
  const { secondaryKind, secondaryRows, secondaryTitle, secondaryKicker, secondarySub } = useMemo(() => {
    if (chartType === 'histogram') {
      return {
        secondaryKind: 'area',
        secondaryRows: secondaryHistogramRows,
        secondaryTitle: 'Cumulative Distribution Curve',
        secondaryKicker: 'ACCUMULATIVE TOTAL',
        secondarySub: 'Progression of total records across continuous value ranges',
      }
    }
    if (chartType === 'pie' || chartType === 'donut') {
      return {
        secondaryKind: 'bar',
        secondaryRows: displayRows,
        secondaryTitle: 'Ranked Magnitude Comparison',
        secondaryKicker: 'LINEAR COMPARISON',
        secondarySub: 'Compare absolute bar heights for accurate variance and ranking',
      }
    }
    if (chartType === 'scatter') {
      return {
        secondaryKind: 'histogram',
        secondaryRows: displayRows.slice(0, 15).map(r => ({ name: String(r.x), value: Number(r.y) })),
        secondaryTitle: 'X-Variable Density Profile',
        secondaryKicker: 'DISTRIBUTION',
        secondarySub: 'Histogram of values across the primary coordinate space',
      }
    }
    if (chartType === 'heatmap') {
      return {
        secondaryKind: 'bar',
        secondaryRows: displayRows.slice(0, 10).map(r => ({ name: `${r.x} ↔ ${r.y}`, value: Math.abs(Number(r.value)) })),
        secondaryTitle: 'Top Strongest Correlations (|r|)',
        secondaryKicker: 'MAGNITUDE',
        secondarySub: 'Absolute strength of linear association between numeric variables',
      }
    }
    return {
      secondaryKind: 'donut',
      secondaryRows: displayRows,
      secondaryTitle: 'Category Proportional Share',
      secondaryKicker: 'PERCENT COMPOSITION',
      secondarySub: 'Donut slice proportion of the total plotted volume',
    }
  }, [chartType, displayRows, secondaryHistogramRows])

  // Save to Dashboard Action
  async function handleSaveDashboard() {
    if (!dataset) return
    const defaultName = `${dataset.name} - ${chartType.toUpperCase()} Analysis`
    const dashboardName = window.prompt('Enter a name for this dashboard card:', defaultName)
    if (!dashboardName || !dashboardName.trim()) return

    setSavingDashboard(true)
    try {
      const res = await request('/api/dashboards', {
        method: 'POST',
        body: JSON.stringify({
          dataset_id: dataset.id,
          name: dashboardName.trim(),
          configuration: {
            chartType,
            xColumn,
            yColumn,
            aggregation,
            topN,
            sortOrder,
            paletteKey,
            curveType,
            barOrientation,
            showTrendline,
            showNormalCurve,
            histogramMode,
            histogramBins,
          },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      showNotice(`Saved "${dashboardName.trim()}" to your dashboards!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showNotice(`Failed to save dashboard: ${msg}`)
    } finally {
      setSavingDashboard(false)
    }
  }

  // Cross-Filter Handler
  function handleItemClick(item: { name: string; value?: number; x?: unknown; y?: unknown }) {
    if (chartType === 'heatmap' && item.x && item.y) {
      setXColumn(String(item.x))
      setYColumn(String(item.y))
      setChartType('scatter')
      showNotice(`Switched to Scatter Plot: ${item.x} vs ${item.y}`)
      return
    }

    if (chartType === 'missing') {
      if (onCrossFilter) {
        onCrossFilter(item.name, '')
      }
      return
    }

    const targetCol = xColumn || (columns[0]?.name ?? '')
    if (targetCol && item.name && onCrossFilter) {
      onCrossFilter(targetCol, String(item.name))
    }
  }

  // Export CSV Action
  function exportVizCsv() {
    if (!displayRows.length) return
    const headers = ['Rank', 'Segment / Interval', 'Value', 'Share (%)']
    const lines = [headers.join(',')]
    displayRows.forEach((row, i) => {
      const share = totalPlotted > 0 ? ((row.value / totalPlotted) * 100).toFixed(1) + '%' : '0%'
      const cleanName = `"${String(row.name).replace(/"/g, '""')}"`
      lines.push([i + 1, cleanName, row.value, share].join(','))
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${dataset?.name || 'datalume'}-viz-${xColumn}-${chartType}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showNotice('Exported chart breakdown as CSV.')
  }

  // Chart type definition list
  const chartTypes: { key: ChartType; label: string; group: string }[] = [
    { key: 'bar', label: 'Bar', group: 'Standard' },
    { key: 'horizontal-bar', label: 'Top-N Bar', group: 'Standard' },
    { key: 'area', label: 'Smooth Area', group: 'Standard' },
    { key: 'line', label: 'Line Trend', group: 'Standard' },
    { key: 'donut', label: 'Donut Pie', group: 'Composition' },
    { key: 'treemap', label: 'Treemap', group: 'Composition' },
    { key: 'histogram', label: 'Histogram', group: 'Distribution' },
    { key: 'boxplot', label: 'Box Plot', group: 'Distribution' },
    { key: 'scatter', label: 'Scatter Plot', group: 'Relational' },
    { key: 'heatmap', label: 'Correlation Heatmap', group: 'Relational' },
    { key: 'radar', label: 'Radar Profile', group: 'Advanced' },
    { key: 'missing', label: 'Missing Values', group: 'Diagnostics' },
  ]

  return (
    <div className="viz-studio-container" data-testid="visualization-page">
      {/* Studio Header */}
      <div className="panel viz-studio-head">
        <div>
          <div className="panel-kicker">
            <Sparkles size={12} className="inline-sparkle" /> INTERACTIVE ANALYTICS STUDIO
          </div>
          <h2>Visualization Studio</h2>
          <p className="viz-subtitle">
            Professional charting & cross-filtering for <strong>{dataset?.name || 'active dataset'}</strong>.
            {loading && (
              <span className="viz-loading-indicator">
                <LoaderCircle className="spin" size={13} /> Rendering updates...
              </span>
            )}
          </p>
        </div>

        <div className="viz-head-controls">
          <div className="viz-pill-group" role="group" aria-label="View Mode">
            <button
              type="button"
              className={viewMode === 'dual' ? 'active' : ''}
              onClick={() => setViewMode('dual')}
              title="Dual View: Compare primary visualizer with complementary perspective"
            >
              <Split size={13} /> Dual View
            </button>
            <button
              type="button"
              className={viewMode === 'focus' ? 'active' : ''}
              onClick={() => setViewMode('focus')}
              title="Focus View: Expand primary visualizer to full width"
            >
              <Maximize2 size={13} /> Focus View
            </button>
          </div>

          <div className="viz-palette-picker">
            {(Object.keys(COLOR_PALETTES) as PaletteKey[]).map(key => {
              const pal = COLOR_PALETTES[key]
              return (
                <button
                  type="button"
                  key={key}
                  className={`palette-chip ${paletteKey === key ? 'selected' : ''}`}
                  onClick={() => setPaletteKey(key)}
                  title={`Color theme: ${pal.name}`}
                >
                  <span className="palette-dot" style={{ backgroundColor: pal.primary }} />
                  <span className="palette-label">{pal.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            className="button-secondary viz-save-dashboard-btn"
            onClick={handleSaveDashboard}
            disabled={savingDashboard || !displayRows.length}
            title="Save this chart configuration to Dashboard"
          >
            <BookmarkPlus size={14} /> {savingDashboard ? 'Saving...' : 'Save to Dashboard'}
          </button>

          <button
            type="button"
            className="button-secondary viz-export-btn"
            onClick={exportVizCsv}
            title="Download plotted chart breakdown as CSV"
          >
            <ArrowDownToLine size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="panel viz-controls-panel">
        <div className="viz-type-section">
          <span className="viz-label-kicker">CHART VISUALIZER</span>
          <div className="viz-type-tabs">
            {chartTypes.map(item => (
              <button
                type="button"
                key={item.key}
                className={`viz-tab-btn ${chartType === item.key ? 'selected' : ''}`}
                onClick={() => setChartType(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Mapping Controls */}
        <div className="viz-mapping-grid">
          {chartType !== 'heatmap' && chartType !== 'missing' && (
            <label>
              <span>{chartType === 'histogram' || chartType === 'boxplot' ? 'Numeric Field' : 'Category / X-Axis'}</span>
              <select value={xColumn} onChange={e => setXColumn(e.target.value)}>
                {(chartType === 'histogram' || chartType === 'boxplot' || chartType === 'scatter' ? numericColumns : columns).map(
                  col => (
                    <option key={col.name} value={col.name}>
                      {col.name} ({col.type})
                    </option>
                  )
                )}
              </select>
            </label>
          )}

          {chartType === 'scatter' ? (
            <label>
              <span>Y-Axis Coordinate</span>
              <select value={yColumn} onChange={e => setYColumn(e.target.value)}>
                {numericColumns.map(col => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </label>
          ) : chartType !== 'heatmap' && chartType !== 'missing' && chartType !== 'boxplot' && chartType !== 'histogram' ? (
            <label>
              <span>Value / Y-Axis</span>
              <select
                value={yColumn}
                onChange={e => setYColumn(e.target.value)}
                disabled={!numericColumns.length}
              >
                <option value="">Count records</option>
                {numericColumns.map(col => (
                  <option key={col.name} value={col.name}>
                    {col.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {chartType !== 'heatmap' &&
            chartType !== 'missing' &&
            chartType !== 'boxplot' &&
            chartType !== 'histogram' &&
            chartType !== 'scatter' && (
              <label>
                <span>Aggregation</span>
                <select value={aggregation} onChange={e => setAggregation(e.target.value)}>
                  <option value="count">Count of records</option>
                  <option value="sum">Sum</option>
                  <option value="average">Average</option>
                  <option value="minimum">Minimum</option>
                  <option value="maximum">Maximum</option>
                  <option value="median">Median</option>
                </select>
              </label>
            )}

          {/* Histogram Controls */}
          {chartType === 'histogram' && (
            <>
              <label>
                <span>Bins ({histogramBins})</span>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={histogramBins}
                  onChange={e => setHistogramBins(Number(e.target.value))}
                  className="viz-slider"
                />
              </label>
              <label>
                <span>Scale Mode</span>
                <select
                  value={histogramMode}
                  onChange={e => setHistogramMode(e.target.value as 'frequency' | 'density')}
                >
                  <option value="frequency">Frequency Count</option>
                  <option value="density">Relative Density (%)</option>
                </select>
              </label>
              <label className="viz-checkbox-label">
                <input
                  type="checkbox"
                  checked={showNormalCurve}
                  onChange={e => setShowNormalCurve(e.target.checked)}
                />
                <span>Bell Curve Overlay</span>
              </label>
            </>
          )}

          {/* Scatter Controls */}
          {chartType === 'scatter' && (
            <label className="viz-checkbox-label">
              <input
                type="checkbox"
                checked={showTrendline}
                onChange={e => setShowTrendline(e.target.checked)}
              />
              <span>Trendline (y = mx + b)</span>
            </label>
          )}

          {/* Bar Controls */}
          {(chartType === 'bar' || chartType === 'horizontal-bar') && (
            <label>
              <span>Orientation</span>
              <select
                value={chartType === 'horizontal-bar' ? 'horizontal' : barOrientation}
                onChange={e => setBarOrientation(e.target.value as 'vertical' | 'horizontal')}
              >
                <option value="vertical">Vertical Columns</option>
                <option value="horizontal">Horizontal Top-N</option>
              </select>
            </label>
          )}

          {/* Curve Control for Area & Line */}
          {(chartType === 'area' || chartType === 'line') && (
            <label>
              <span>Curve Style</span>
              <select
                value={curveType}
                onChange={e => setCurveType(e.target.value as 'monotone' | 'linear')}
              >
                <option value="monotone">Monotone Smooth</option>
                <option value="linear">Linear Straight</option>
              </select>
            </label>
          )}

          {chartType !== 'heatmap' && chartType !== 'missing' && chartType !== 'histogram' && (
            <label>
              <span>Top Segments</span>
              <select value={topN} onChange={e => setTopN(Number(e.target.value))}>
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={25}>Top 25</option>
              </select>
            </label>
          )}

          {chartType !== 'histogram' && chartType !== 'heatmap' && chartType !== 'boxplot' && (
            <label>
              <span>Sort Order</span>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as 'desc' | 'asc' | 'alpha')}
              >
                <option value="desc">Highest First (Desc)</option>
                <option value="asc">Lowest First (Asc)</option>
                <option value="alpha">Alphabetical (A–Z)</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="viz-kpi-row">
        <div className="viz-kpi-item">
          <div className="viz-kpi-top">
            <span className="viz-kpi-icon" style={{ color: activePalette.primary }}>
              <BarChart3 size={15} />
            </span>
            <span className="viz-kpi-tag">TOTAL VOLUME</span>
          </div>
          <div className="viz-kpi-val">{totalPlotted.toLocaleString()}</div>
          <div className="viz-kpi-sub">Sum of plotted values / points</div>
        </div>
        <div className="viz-kpi-item">
          <div className="viz-kpi-top">
            <span className="viz-kpi-icon" style={{ color: activePalette.primary }}>
              <TrendingUp size={15} />
            </span>
            <span className="viz-kpi-tag">AVERAGE</span>
          </div>
          <div className="viz-kpi-val">{averagePlotted.toLocaleString()}</div>
          <div className="viz-kpi-sub">Mean volume per segment</div>
        </div>
        <div className="viz-kpi-item">
          <div className="viz-kpi-top">
            <span className="viz-kpi-icon" style={{ color: activePalette.primary }}>
              <Award size={15} />
            </span>
            <span className="viz-kpi-tag">PEAK LEADER</span>
          </div>
          <div
            className="viz-kpi-val truncate"
            title={peakItem ? `${peakItem.name}: ${peakItem.value}` : ''}
          >
            {peakItem ? peakItem.name : '—'}
          </div>
          <div className="viz-kpi-sub">
            {peakItem ? `${peakItem.value.toLocaleString()} top value` : '—'}
          </div>
        </div>
        <div className="viz-kpi-item">
          <div className="viz-kpi-top">
            <span className="viz-kpi-icon" style={{ color: activePalette.primary }}>
              <Layers size={15} />
            </span>
            <span className="viz-kpi-tag">PLOTTED SEGMENTS</span>
          </div>
          <div className="viz-kpi-val">{displayRows.length}</div>
          <div className="viz-kpi-sub">
            {onCrossFilter ? 'Click any segment to cross-filter' : 'Active plotted segments'}
          </div>
        </div>
      </div>

      {/* Main Visualizer Canvas */}
      <div className={`viz-chart-canvas ${viewMode === 'focus' ? 'focus-mode' : 'dual-mode'}`}>
        <div className="panel viz-graph-card primary-graph">
          <div className="viz-card-header">
            <div>
              <div className="panel-kicker">PRIMARY VISUALIZER · {chartType.toUpperCase()}</div>
              <h3>
                {chartType === 'heatmap'
                  ? 'Pearson Correlation Matrix (All Numeric Columns)'
                  : chartType === 'missing'
                  ? 'Column Completeness & Missing Values Rate'
                  : `${xColumn || 'Field'} distribution ${
                      yColumn && aggregation !== 'count' ? `by ${aggregation} of ${yColumn}` : ''
                    }`}
              </h3>
              <p className="viz-card-sub">
                Interactive {chartType} visualization across {displayRows.length} segments. Click any bar, segment, or cell to cross-filter.
              </p>
            </div>
            <span
              className="viz-badge"
              style={{ borderColor: activePalette.primary, color: activePalette.primary }}
            >
              {chartType === 'histogram'
                ? `${histogramBins} Bins`
                : `${displayRows.length} Elements`}
            </span>
          </div>
          <div className="viz-graphic-wrap">
            <ChartGraphic
              rows={displayRows}
              kind={chartType}
              emptyText="Select fields above to generate chart."
              colors={activePalette.colors}
              primaryColor={activePalette.primary}
              fillColor={activePalette.fill}
              orientation={chartType === 'horizontal-bar' ? 'horizontal' : barOrientation}
              curveType={curveType}
              showTrendline={showTrendline}
              showNormalCurve={showNormalCurve}
              histogramMode={histogramMode}
              onItemClick={handleItemClick}
            />
          </div>
        </div>

        {/* Secondary Visualizer */}
        {viewMode === 'dual' && (
          <div className="panel viz-graph-card secondary-graph">
            <div className="viz-card-header">
              <div>
                <div className="panel-kicker">{secondaryKicker} · {secondaryKind.toUpperCase()}</div>
                <h3>{secondaryTitle}</h3>
                <p className="viz-card-sub">{secondarySub}</p>
              </div>
              <span className="viz-badge secondary-badge">Complementary View</span>
            </div>
            <div className="viz-graphic-wrap">
              <ChartGraphic
                rows={secondaryRows}
                kind={secondaryKind}
                emptyText="Secondary view requires plotted data."
                colors={activePalette.colors}
                primaryColor={activePalette.primary}
                fillColor={activePalette.fill}
                onItemClick={handleItemClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Segment Breakdown Table (when applicable) */}
      {chartType !== 'heatmap' && chartType !== 'scatter' && (
        <div className="panel viz-table-panel">
          <div className="viz-table-head">
            <div>
              <div className="panel-kicker">DETAILED BREAKDOWN</div>
              <h3>Segment & Metric Distribution Table</h3>
            </div>
            <div className="viz-table-meta">
              <span>
                Total volume: <strong>{totalPlotted.toLocaleString()}</strong>
              </span>
            </div>
          </div>
          <div className="viz-table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45 }}>#</th>
                  <th>Segment / Interval</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Share</th>
                  <th style={{ width: 220 }}>Volume Proportion</th>
                  {onCrossFilter && <th style={{ width: 110, textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => {
                  const shareNum = totalPlotted > 0 ? (row.value / totalPlotted) * 100 : 0
                  const shareFormatted = shareNum.toFixed(1) + '%'
                  const isHighlighted = activeHighlight === row.name
                  return (
                    <tr
                      key={row.name}
                      className={isHighlighted ? 'row-highlighted' : ''}
                      onMouseEnter={() => setActiveHighlight(row.name)}
                      onMouseLeave={() => setActiveHighlight(null)}
                    >
                      <td className="row-number">#{idx + 1}</td>
                      <td className="viz-td-name">
                        <strong>{row.name}</strong>
                      </td>
                      <td className="viz-td-val" style={{ textAlign: 'right' }}>
                        {row.value.toLocaleString()}
                      </td>
                      <td className="viz-td-share" style={{ textAlign: 'right' }}>
                        {shareFormatted}
                      </td>
                      <td>
                        <div className="viz-progress-track">
                          <div
                            className="viz-progress-bar"
                            style={{
                              width: `${Math.min(100, Math.max(3, shareNum))}%`,
                              backgroundColor: activePalette.colors[idx % activePalette.colors.length],
                            }}
                          />
                        </div>
                      </td>
                      {onCrossFilter && (
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="viz-filter-row-btn"
                            onClick={() => handleItemClick(row)}
                            title={`Filter dataset by ${row.name}`}
                          >
                            Filter
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {!displayRows.length && (
                  <tr>
                    <td
                      colSpan={onCrossFilter ? 6 : 5}
                      style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-faint)' }}
                    >
                      No segment data available for the chosen configuration.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
