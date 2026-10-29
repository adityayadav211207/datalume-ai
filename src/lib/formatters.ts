import type { Dataset } from './types'

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character
  )
}

export function normalizeChatContent(value: unknown): string {
  if (typeof value === 'string') {
    return value === '[object Object]' ? 'This older reply could not be displayed. Please ask Lumi again.' : value
  }
  if (value && typeof value === 'object') {
    const response = value as Record<string, unknown>
    for (const key of ['answer', 'content', 'message', 'text']) {
      if (response[key] !== undefined) return normalizeChatContent(response[key])
    }
    return Object.entries(response)
      .map(([key, item]) => `${key}: ${normalizeChatContent(item)}`)
      .join('\n')
  }
  return value === null || value === undefined ? '' : String(value)
}

export function formatMetric(value: number): string {
  return typeof value === 'number'
    ? new Intl.NumberFormat(undefined, {
        notation: Math.abs(value) >= 100000 ? 'compact' : 'standard',
        maximumFractionDigits: 2,
      }).format(value)
    : String(value)
}

export function makeKpis(dataset: Dataset) {
  return [
    {
      label: 'Records',
      value: dataset.metadata.row_count,
      column: null,
      calculation: 'Row count',
    },
  ]
}

export function formatXLabel(val: string): string {
  if (typeof val !== 'string') return String(val ?? '')
  if (val.startsWith('(') && val.includes(',')) {
    const parts = val.replace(/[()[\]]/g, '').split(',')
    if (parts.length === 2) {
      const l = parseFloat(parts[0])
      const r = parseFloat(parts[1])
      if (!isNaN(l) && !isNaN(r)) {
        const fl = Math.abs(l) < 0.01 ? 0 : Math.round(l * 10) / 10
        const fr = Math.round(r * 10) / 10
        return `${fl}–${fr}`
      }
    }
  }
  if (val.includes(' / ')) {
    const [left, right] = val.split(' / ')
    const shorten = (s: string) => (s.length > 7 ? `${s.slice(0, 6)}.` : s)
    return `${shorten(left)} / ${shorten(right)}`
  }
  return val.length > 10 ? `${val.slice(0, 9)}…` : val
}

export function countUpFrames(target: number, steps = 24): number[] {
  if (!Number.isFinite(target) || steps <= 1 || target === 0) {
    return [target]
  }
  const isInt = Number.isInteger(target)
  const frames: number[] = []
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps
    const eased = 1 - Math.pow(1 - progress, 2)
    const val = eased * target
    frames.push(isInt ? Math.round(val) : Math.round(val * 100) / 100)
  }
  frames[frames.length - 1] = target
  return frames
}

export interface RegressionResult {
  slope: number
  intercept: number
  r2: number
  predict: (x: number) => number
}

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const valid = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  const n = valid.length
  if (n < 2) {
    const yVal = n === 1 ? valid[0].y : 0
    return {
      slope: 0,
      intercept: yVal,
      r2: 0,
      predict: () => yVal,
    }
  }

  let sumX = 0
  let sumY = 0
  for (const p of valid) {
    sumX += p.x
    sumY += p.y
  }
  const meanX = sumX / n
  const meanY = sumY / n

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (const p of valid) {
    const dx = p.x - meanX
    const dy = p.y - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const slope = denomX === 0 ? 0 : numerator / denomX
  const intercept = meanY - slope * meanX
  const r2 =
    denomX === 0 || denomY === 0
      ? 0
      : Math.max(0, Math.min(1, Math.pow(numerator, 2) / (denomX * denomY)))

  return {
    slope: Math.round(slope * 10000) / 10000,
    intercept: Math.round(intercept * 10000) / 10000,
    r2: Math.round(r2 * 10000) / 10000,
    predict: (x: number) => Math.round((slope * x + intercept) * 10000) / 10000,
  }
}

export function normalDistribution(
  mean: number,
  std: number,
  bins: number[]
): { x: number; y: number }[] {
  if (!bins || bins.length === 0) return []
  if (!Number.isFinite(mean) || !Number.isFinite(std) || std <= 0) {
    return bins.map(x => ({ x, y: 0 }))
  }
  const factor = 1 / (std * Math.sqrt(2 * Math.PI))
  const twoVariance = 2 * std * std

  return bins.map(x => {
    const exponent = -Math.pow(x - mean, 2) / twoVariance
    const density = factor * Math.exp(exponent)
    return { x, y: Number.isFinite(density) ? density : 0 }
  })
}

