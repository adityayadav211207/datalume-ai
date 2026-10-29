import { useCallback, useState } from 'react'
import type { Dataset, Filters, ReportPreferences, RowResult } from '../lib/types'
import { loadReportPreferences } from '../lib/constants'
import { escapeHtml, makeKpis } from '../lib/formatters'

export interface DownloadReportData {
  dataset: Dataset | null
  rows: RowResult | null
  filters: Filters
  chartRows?: { name: string; value: number }[]
  categoryShareRows?: { name: string; value: number }[]
  comparisonRows?: { name: string; value: number }[]
  histogramRows?: { name: string; value: number }[]
}

export function useReports(showNotice: (msg: string) => void) {
  const [reportPreferences, setReportPreferences] = useState<ReportPreferences>(loadReportPreferences)

  const updateReportPreferences = useCallback((next: ReportPreferences) => {
    setReportPreferences(next)
    localStorage.setItem('datalume-report-preferences', JSON.stringify(next))
  }, [])

  const downloadReport = useCallback(
    ({
      dataset,
      rows,
      filters,
      chartRows = [],
      categoryShareRows = [],
      comparisonRows = [],
      histogramRows = [],
    }: DownloadReportData) => {
      if (!dataset) {
        showNotice('Select a dataset before creating a report.')
        return
      }
      const kpiCards = dataset.kpis || makeKpis(dataset)
      const metrics = kpiCards
        .map(
          kpi =>
            `<article class="metric"><span>${escapeHtml(kpi.label)}</span><strong>${escapeHtml(
              new Intl.NumberFormat(undefined, {
                notation: reportPreferences.numberFormat === 'compact' ? 'compact' : 'standard',
                maximumFractionDigits: 2,
              }).format(kpi.value)
            )}</strong><small>${escapeHtml(kpi.calculation)}</small></article>`
        )
        .join('')

      const renderSvgBarChart = (data: { name: string; value: number }[]) => {
        if (!data.length) return ''
        const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1)
        const barHeight = 22
        const gap = 10
        const labelWidth = 140
        const chartWidth = 620
        const totalHeight = data.length * (barHeight + gap) + 12
        const maxBarWidth = chartWidth - labelWidth - 80

        const bars = data
          .map((item, idx) => {
            const y = idx * (barHeight + gap) + 6
            const width = Math.max(5, Math.round((Math.abs(item.value) / maxVal) * maxBarWidth))
            const valStr = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
              item.value
            )
            const label = item.name.length > 20 ? item.name.slice(0, 18) + '…' : item.name

            return `<g class="bar-group">
              <text x="${labelWidth - 10}" y="${y + 15}" text-anchor="end" fill="#525252" font-size="11" font-weight="500">${escapeHtml(label)}</text>
              <rect x="${labelWidth}" y="${y}" width="${width}" height="${barHeight}" rx="4" fill="url(#barGrad)" />
              <text x="${labelWidth + width + 8}" y="${y + 15}" fill="#171717" font-size="11" font-weight="600">${escapeHtml(valStr)}</text>
            </g>`
          })
          .join('')

        return `<div class="chart-graphic-wrap">
          <svg viewBox="0 0 ${chartWidth} ${totalHeight}" width="100%" height="${totalHeight}">
            <defs>
              <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#E8590C" />
                <stop offset="100%" stop-color="#F76707" />
              </linearGradient>
            </defs>
            ${bars}
          </svg>
        </div>`
      }

      const renderSvgSegmentedDonut = (data: { name: string; value: number }[]) => {
        if (!data.length) return ''
        const total = data.reduce((acc, d) => acc + (d.value > 0 ? d.value : 0), 0)
        if (total <= 0) return ''
        const colors = ['#E8590C', '#0D9488', '#2563EB', '#7C3AED', '#DB2777', '#D97706', '#059669', '#4F46E5']

        let currentOffset = 0
        const segments = data
          .map((d, i) => {
            const pct = Math.max(0, (d.value / total) * 100)
            const color = colors[i % colors.length]
            const seg = `<rect x="${currentOffset}%" y="0" width="${pct}%" height="24" fill="${color}" />`
            currentOffset += pct
            return seg
          })
          .join('')

        const legend = data
          .map((d, i) => {
            const pct = ((d.value / total) * 100).toFixed(1)
            const color = colors[i % colors.length]
            return `<span class="legend-item">
              <span class="legend-swatch" style="background:${color}"></span>
              <span class="legend-label">${escapeHtml(d.name)}</span>
              <strong class="legend-pct">${pct}%</strong>
            </span>`
          })
          .join('')

        return `<div class="donut-chart-wrap">
          <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none" style="border-radius:6px;overflow:hidden;margin-bottom:12px;">
            ${segments}
          </svg>
          <div class="donut-legend">${legend}</div>
        </div>`
      }

      const renderSvgHistogram = (data: { name: string; value: number }[]) => {
        if (!data.length) return ''
        const maxVal = Math.max(...data.map(d => d.value), 1)
        const chartHeight = 120
        const chartWidth = 560
        const barWidth = Math.max(8, Math.floor((chartWidth - data.length * 6) / data.length))

        const bars = data
          .map((item, idx) => {
            const h = Math.max(4, Math.round((item.value / maxVal) * (chartHeight - 34)))
            const x = idx * (barWidth + 6) + 12
            const y = chartHeight - 22 - h
            const label = item.name.length > 8 ? item.name.slice(0, 6) + '..' : item.name

            return `<g class="hist-bar">
              <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="3" fill="url(#histGrad)" />
              <text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" fill="#525252" font-size="9" font-weight="600">${item.value}</text>
              <text x="${x + barWidth / 2}" y="${chartHeight - 6}" text-anchor="middle" fill="#737373" font-size="9">${escapeHtml(label)}</text>
            </g>`
          })
          .join('')

        return `<div class="chart-graphic-wrap">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" width="100%" height="${chartHeight}">
            <defs>
              <linearGradient id="histGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#0D9488" />
                <stop offset="100%" stop-color="#047857" />
              </linearGradient>
            </defs>
            ${bars}
          </svg>
        </div>`
      }

      const reportChartSections: { title: string; values: { name: string; value: number }[]; type: string }[] = [
        { title: 'Field distribution', values: chartRows, type: 'bar' },
        { title: 'Category share', values: categoryShareRows, type: 'donut' },
        { title: 'Average by category', values: comparisonRows, type: 'bar' },
        { title: 'Numeric distribution', values: histogramRows, type: 'histogram' },
      ].filter(item => item.values.length > 0)

      const charts = reportChartSections
        .map(({ title, values, type }) => {
          let svgGraphic = ''
          if (type === 'donut') svgGraphic = renderSvgSegmentedDonut(values)
          else if (type === 'histogram') svgGraphic = renderSvgHistogram(values)
          else svgGraphic = renderSvgBarChart(values)

          const tableRows = values
            .map(
              row =>
                `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(
                  new Intl.NumberFormat(undefined, {
                    notation: reportPreferences.numberFormat === 'compact' ? 'compact' : 'standard',
                    maximumFractionDigits: 2,
                  }).format(row.value)
                )}</td></tr>`
            )
            .join('')

          return `<section class="chart-card">
            <h2>${escapeHtml(title)}</h2>
            ${svgGraphic}
            <details class="chart-table-toggle">
              <summary>View detailed data table (${values.length} items)</summary>
              <table><thead><tr><th>Label / range</th><th>Value</th></tr></thead><tbody>${tableRows}</tbody></table>
            </details>
          </section>`
        })
        .join('')

      const activeFilters =
        Object.entries(filters)
          .map(
            ([column, spec]) =>
              `${column}: ${spec.search || `${spec.min ?? 'Any'} to ${spec.max ?? 'Any'}`}`
          )
          .join(' | ') || 'None'

      const preview =
        reportPreferences.includePreview && rows?.rows.length
          ? `<section><h2>Data preview</h2><table><thead><tr>${rows.columns
              .map(column => `<th>${escapeHtml(column)}</th>`)
              .join('')}</tr></thead><tbody>${rows.rows
              .slice(0, 25)
              .map(
                row =>
                  `<tr>${rows.columns
                    .map(column => `<td>${escapeHtml(row[column] ?? '')}</td>`)
                    .join('')}</tr>`
              )
              .join(
                ''
              )}</tbody></table><small>Showing up to 25 rows from the current filtered page.</small></section>`
          : ''

      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
        reportPreferences.title
      )} - ${escapeHtml(dataset.name)}</title><style>
      :root{color-scheme:light;--ink:#171717;--muted:#737373;--line:#e5e5e5;--accent:#E8590C;--accent-light:#FFF4E6;--teal:#0D9488;--paper:#ffffff;--soft:#f8f9fa}*{box-sizing:border-box}body{margin:0;background:#f1f3f5;color:var(--ink);font:14px/1.5 'Inter',system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}.report{max-width:1080px;margin:32px auto;background:white;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.06);overflow:hidden}.masthead{padding:36px 48px 28px;border-bottom:1px solid var(--line);background:linear-gradient(135deg,#ffffff,#fdfcf9)}.brand{color:var(--accent);font-size:11px;font-weight:700;letter-spacing:2px;display:flex;align-items:center;gap:6px}.brand::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent)}.masthead h1{margin:14px 0 6px;font-size:32px;font-weight:750;letter-spacing:-0.5px}.subtitle{color:var(--muted);font-size:14px}.meta{display:flex;flex-wrap:wrap;gap:12px 28px;margin-top:24px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}.meta strong{color:var(--ink);font-weight:600}main{padding:32px 48px 48px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:12px}.metric{padding:18px;border:1px solid var(--line);border-radius:8px;background:var(--soft);border-left:4px solid var(--accent)}.metric span{display:block;color:var(--muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}.metric strong{display:block;margin:6px 0;font-size:26px;font-weight:700;color:var(--ink)}.metric small{display:block;color:var(--muted);font-size:11px}section{margin-top:32px}.chart-card{padding:22px;border:1px solid var(--line);border-radius:10px;background:white;margin-bottom:20px}h2{margin:0 0 16px;font-size:18px;font-weight:700;color:var(--ink);letter-spacing:-0.2px}.chart-graphic-wrap{margin:14px 0;background:var(--soft);padding:16px;border-radius:8px;overflow-x:auto}.donut-chart-wrap{margin:16px 0;background:var(--soft);padding:16px;border-radius:8px}.donut-legend{display:flex;flex-wrap:wrap;gap:12px 20px;font-size:12px}.legend-item{display:flex;align-items:center;gap:6px}.legend-swatch{width:10px;height:10px;border-radius:2px;display:inline-block}.legend-pct{color:var(--ink);margin-left:2px}.chart-table-toggle{margin-top:14px;font-size:12px;color:var(--muted);cursor:pointer}.chart-table-toggle summary{font-weight:600;color:var(--accent);margin-bottom:10px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}th{text-align:left;color:var(--muted);background:var(--soft);font-weight:600}th,td{padding:9px 12px;border-bottom:1px solid var(--line)}td:last-child{text-align:right;font-variant-numeric:tabular-nums}.filters{padding:14px 18px;border-left:4px solid var(--teal);background:rgba(13,148,136,0.06);color:var(--ink);border-radius:0 8px 8px 0;font-size:13px;line-height:1.6}.actions{position:fixed;right:24px;top:24px;display:flex;gap:10px;z-index:99}.actions button{padding:10px 18px;border:1px solid #d4d4d4;border-radius:6px;background:white;color:var(--ink);font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.08);transition:all 0.15s}.actions button:hover{background:#f5f5f5}.actions .primary{border-color:var(--accent);background:var(--accent);color:white}.actions .primary:hover{background:#d94e08}.footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:11px;text-align:center}.empty{padding:24px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);text-align:center}@media(max-width:768px){.report{margin:0;border-radius:0}.masthead{padding:24px 20px}.masthead h1{font-size:24px}main{padding:20px}.actions{position:static;justify-content:flex-end;padding:12px 20px 0}table{display:block;overflow-x:auto}}@media print{body{background:white}.report{max-width:none;margin:0;box-shadow:none;border-radius:0}.actions{display:none}.masthead,main{padding-left:12mm;padding-right:12mm}section{break-inside:avoid}a{color:inherit;text-decoration:none}}
      </style></head><body><div class="actions"><button onclick="window.print()">Print / Save PDF</button><button class="primary" onclick="window.close()">Done</button></div><article class="report"><header class="masthead"><div class="brand">DATALUME AI / EXECUTIVE ANALYTICS REPORT</div><h1>${escapeHtml(
        reportPreferences.title
      )}</h1><div class="subtitle">${escapeHtml(
        dataset.name
      )} · Generated on ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })} at ${new Date().toLocaleTimeString()}</div><div class="meta"><span>Dataset: <strong>${escapeHtml(
        dataset.name
      )}</strong></span><span>Total Records: <strong>${dataset.metadata.row_count.toLocaleString()}</strong></span><span>Columns: <strong>${
        dataset.metadata.column_count
      }</strong></span><span>Duplicate rows: <strong>${
        dataset.metadata.duplicate_rows ?? 0
      }</strong></span></div></header><main>${
        reportPreferences.includeKpis
          ? `<section><h2>Executive Summary</h2><div class="metrics">${metrics}</div></section>`
          : ''
      }<section><h2>Analysis Scope &amp; Filters</h2><div class="filters"><strong>Active Filters:</strong> ${escapeHtml(
        activeFilters
      )}<br><strong>Records Analyzed:</strong> ${
        rows?.total.toLocaleString() ?? dataset.metadata.row_count.toLocaleString()
      } of ${dataset.metadata.row_count.toLocaleString()} (${(
        ((rows?.total ?? dataset.metadata.row_count) / Math.max(dataset.metadata.row_count, 1)) *
        100
      ).toFixed(1)}% of total dataset)</div></section>${
        reportPreferences.includeCharts
          ? `<section><h2>Visual Insights &amp; Distributions</h2>${
              charts ||
              '<div class="empty">No chart data is available for the selected fields.</div>'
            }</section>`
          : ''
      }${preview}<div class="footer">Generated by DataLume AI Analytics Suite · Grounded in active dataset calculations and validated filter states.</div></main></article></body></html>`

      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${
        reportPreferences.title
          .trim()
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-|-$/g, '')
          .toLowerCase() || 'analytics-report'
      }.html`
      link.click()
      URL.revokeObjectURL(url)
      showNotice(
        'Professional report downloaded. Open it and choose Print / Save PDF to export a PDF.'
      )
    },
    [reportPreferences, showNotice]
  )

  return {
    reportPreferences,
    setReportPreferences,
    updateReportPreferences,
    downloadReport,
  }
}
