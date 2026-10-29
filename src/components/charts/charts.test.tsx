import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CorrelationHeatmap } from './CorrelationHeatmap'
import { BoxPlotChart } from './BoxPlotChart'
import { MissingValuesChart } from './MissingValuesChart'
import { RadarChart } from './RadarChart'
import { TreemapChart } from './TreemapChart'

describe('CorrelationHeatmap', () => {
  const mockHeatmapData = [
    { x: 'price', y: 'price', value: 1.0 },
    { x: 'price', y: 'sales', value: 0.85 },
    { x: 'sales', y: 'price', value: 0.85 },
    { x: 'sales', y: 'sales', value: 1.0 },
  ]

  it('renders table headers and cells correctly', () => {
    render(<CorrelationHeatmap data={mockHeatmapData} />)
    expect(screen.getByTestId('correlation-heatmap')).toBeInTheDocument()
    expect(screen.getAllByText('price').length).toBeGreaterThan(0)
    expect(screen.getAllByText('sales').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+1.00').length).toBe(2)
    expect(screen.getAllByText('+0.85').length).toBe(2)
  })

  it('calls onSelectPair when a cell is clicked', () => {
    const handleSelect = vi.fn()
    render(<CorrelationHeatmap data={mockHeatmapData} onSelectPair={handleSelect} />)
    const cells = screen.getAllByText('+0.85')
    fireEvent.click(cells[0])
    expect(handleSelect).toHaveBeenCalledWith('sales', 'price')
  })

  it('renders empty panel when less than 2 columns', () => {
    render(<CorrelationHeatmap data={[{ x: 'price', y: 'price', value: 1.0 }]} />)
    expect(screen.getByText(/No correlation data available/i)).toBeInTheDocument()
  })
})

describe('BoxPlotChart', () => {
  const mockBoxData = [
    {
      name: 'revenue',
      min: 10,
      q1: 25,
      median: 50,
      q3: 75,
      max: 100,
      lowWhisker: 10,
      highWhisker: 100,
      outliers: [5, 110],
      value: 50,
    },
  ]

  it('renders SVG with whiskers and box rect', () => {
    const { container } = render(<BoxPlotChart data={mockBoxData} />)
    expect(screen.getByTestId('boxplot-chart')).toBeInTheDocument()
    expect(container.querySelector('.boxplot-svg')).toBeInTheDocument()
    expect(container.querySelector('.boxplot-rect')).toBeInTheDocument()
    expect(container.querySelectorAll('.boxplot-outlier')).toHaveLength(2)
    expect(screen.getByText('revenue')).toBeInTheDocument()
  })

  it('displays info panel on hover', () => {
    const { container } = render(<BoxPlotChart data={mockBoxData} />)
    const glyph = container.querySelector('.boxplot-glyph')
    expect(glyph).toBeInTheDocument()
    fireEvent.mouseEnter(glyph!)
    expect(screen.getByText(/5-Number Summary/i)).toBeInTheDocument()
    expect(screen.getByText('Median:')).toBeInTheDocument()
    expect(screen.getAllByText('50').length).toBe(2)
  })
})

describe('MissingValuesChart', () => {
  const mockMissingData = [
    { name: 'email', value: 0.5, missing: 5, total: 1000 },
    { name: 'phone', value: 4.2, missing: 42, total: 1000 },
    { name: 'notes', value: 18.0, missing: 180, total: 1000 },
  ]

  it('renders rows with threshold badges and summary pills', () => {
    render(<MissingValuesChart data={mockMissingData} />)
    expect(screen.getByTestId('missing-values-chart')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('0.5%')).toBeInTheDocument()
    expect(screen.getByText('phone')).toBeInTheDocument()
    expect(screen.getByText('4.2%')).toBeInTheDocument()
    expect(screen.getByText('notes')).toBeInTheDocument()
    expect(screen.getByText('18.0%')).toBeInTheDocument()
  })

  it('calls onSelectColumn when a row is clicked', () => {
    const handleSelect = vi.fn()
    render(<MissingValuesChart data={mockMissingData} onSelectColumn={handleSelect} />)
    fireEvent.click(screen.getByText('notes'))
    expect(handleSelect).toHaveBeenCalledWith('notes')
  })
})

describe('RadarChart', () => {
  it('renders message if fewer than 3 categories', () => {
    render(<RadarChart rows={[{ name: 'A', value: 10 }, { name: 'B', value: 20 }]} />)
    expect(screen.getByText(/requires at least 3 categories/i)).toBeInTheDocument()
  })

  it('renders radar chart container when sufficient rows', () => {
    render(
      <RadarChart
        rows={[
          { name: 'A', value: 10 },
          { name: 'B', value: 20 },
          { name: 'C', value: 30 },
        ]}
      />
    )
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })
})

describe('TreemapChart', () => {
  it('renders treemap container', () => {
    render(
      <TreemapChart
        rows={[
          { name: 'Alpha', value: 100 },
          { name: 'Beta', value: 80 },
        ]}
      />
    )
    expect(screen.getByTestId('treemap-chart')).toBeInTheDocument()
  })
})
