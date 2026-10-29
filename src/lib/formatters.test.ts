import { describe, it, expect } from 'vitest'
import {
  formatMetric,
  escapeHtml,
  normalizeChatContent,
  formatXLabel,
  makeKpis,
  countUpFrames,
  linearRegression,
  normalDistribution,
} from './formatters'
import type { Dataset } from './types'

describe('formatters', () => {
  describe('countUpFrames', () => {
    it('returns array ending with target number', () => {
      const frames = countUpFrames(100, 5)
      expect(frames).toHaveLength(5)
      expect(frames[frames.length - 1]).toBe(100)
      expect(frames[0]).toBeGreaterThan(0)
      expect(frames[0]).toBeLessThan(100)
    })

    it('handles zero and non-finite values gracefully', () => {
      expect(countUpFrames(0)).toEqual([0])
      expect(countUpFrames(NaN)).toEqual([NaN])
      expect(countUpFrames(100, 1)).toEqual([100])
    })

    it('handles floating point targets with 2 decimal precision', () => {
      const frames = countUpFrames(12.5, 4)
      expect(frames[frames.length - 1]).toBe(12.5)
      expect(frames.every(f => typeof f === 'number')).toBe(true)
    })
  })

  describe('formatMetric', () => {
    it('formats zero correctly', () => {
      expect(formatMetric(0)).toBe('0')
    })

    it('formats standard numbers under 100k', () => {
      const res = formatMetric(4520)
      expect(res).toContain('4')
      expect(res).toContain('520')
    })

    it('formats large numbers >= 100k with compact notation', () => {
      const res = formatMetric(1500000)
      // Compact notation uses 'M' in Western locales or 'L' (Lakhs) in en-IN locales
      expect(res.toLowerCase()).toMatch(/[ml]/)
      expect(res.length).toBeLessThan(7)
    })
  })

  describe('escapeHtml', () => {
    it('escapes special characters', () => {
      expect(escapeHtml('<script>alert("xss")&\'</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&amp;&#39;&lt;/script&gt;'
      )
    })

    it('handles null and undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })
  })

  describe('normalizeChatContent', () => {
    it('returns direct strings', () => {
      expect(normalizeChatContent('Hello world')).toBe('Hello world')
    })

    it('extracts nested answer property from object', () => {
      expect(normalizeChatContent({ answer: '42' })).toBe('42')
    })

    it('replaces [object Object] placeholder with helpful text', () => {
      expect(normalizeChatContent('[object Object]')).toContain('could not be displayed')
    })
  })

  describe('formatXLabel', () => {
    it('formats bucket interval notation', () => {
      expect(formatXLabel('(10.0, 20.0)')).toBe('10–20')
    })

    it('shortens composite slash categories', () => {
      expect(formatXLabel('VeryLongCategory / Short')).toBe('VeryLo. / Short')
    })

    it('truncates strings longer than 10 characters', () => {
      expect(formatXLabel('SuperLongTextValue')).toBe('SuperLong…')
    })
  })

  describe('makeKpis', () => {
    it('returns dataset record count KPI', () => {
      const mockDataset: Dataset = {
        id: 'ds-1',
        name: 'test.csv',
        metadata: {
          row_count: 500,
          column_count: 4,
          columns: [],
          duplicate_rows: 0,
        },
      }
      const kpis = makeKpis(mockDataset)
      expect(kpis).toHaveLength(1)
      expect(kpis[0].value).toBe(500)
      expect(kpis[0].label).toBe('Records')
    })
  })

  describe('linearRegression', () => {
    it('calculates slope, intercept, and r2 for a linear set of points', () => {
      const points = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
        { x: 4, y: 8 },
      ]
      const result = linearRegression(points)
      expect(result.slope).toBeCloseTo(2, 2)
      expect(result.intercept).toBeCloseTo(0, 2)
      expect(result.r2).toBeCloseTo(1, 2)
      expect(result.predict(5)).toBeCloseTo(10, 2)
    })

    it('handles flat lines (slope 0)', () => {
      const points = [
        { x: 1, y: 5 },
        { x: 2, y: 5 },
        { x: 3, y: 5 },
      ]
      const result = linearRegression(points)
      expect(result.slope).toBe(0)
      expect(result.intercept).toBe(5)
      expect(result.predict(10)).toBe(5)
    })

    it('handles fewer than 2 points safely', () => {
      expect(linearRegression([])).toEqual({ slope: 0, intercept: 0, r2: 0, predict: expect.any(Function) })
      expect(linearRegression([{ x: 2, y: 7 }]).intercept).toBe(7)
    })
  })

  describe('normalDistribution', () => {
    it('calculates bell curve points with peak at mean', () => {
      const bins = [0, 5, 10, 15, 20]
      const dist = normalDistribution(10, 2, bins)
      expect(dist).toHaveLength(5)
      const peak = dist.find(p => p.x === 10)
      const tail = dist.find(p => p.x === 0)
      expect(peak!.y).toBeGreaterThan(tail!.y)
    })

    it('handles empty bins or non-positive std', () => {
      expect(normalDistribution(10, 0, [1, 2, 3])).toEqual([
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ])
      expect(normalDistribution(10, 2, [])).toEqual([])
    })
  })
})
