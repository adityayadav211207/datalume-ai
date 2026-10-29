import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { OverviewPage } from './OverviewPage'
import type { Dataset, Column } from '../lib/types'
import type { ApiClient } from '../lib/api'

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 400, height: 200 }}>
        {children}
      </div>
    ),
  }
})

describe('OverviewPage', () => {
  const mockDataset: Dataset = {
    id: 'ds-test-1',
    name: 'sales_data.csv',
    metadata: {
      row_count: 1000,
      column_count: 3,
      columns: [
        { name: 'region', type: 'string', missing: 0, missing_percent: 0, unique: 4 },
        { name: 'revenue', type: 'float', missing: 25, missing_percent: 2.5, unique: 800 },
        { name: 'units', type: 'int', missing: 0, missing_percent: 0, unique: 150 },
      ],
      duplicate_rows: 5,
    },
    statistics: {
      numeric: {
        revenue: { min: 10, mean: 150, median: 140, max: 800, std: 95, count: 975 },
        units: { min: 1, mean: 12, median: 10, max: 50, std: 4, count: 1000 },
      },
      categorical: {
        region: [
          { value: 'North America', count: 450 },
          { value: 'Europe', count: 300 },
        ],
      },
      correlations: {
        revenue: { revenue: 1, units: 0.82 },
        units: { revenue: 0.82, units: 1 },
      },
    },
    kpis: [
      { label: 'Records', value: 1000, column: null, calculation: 'Total dataset rows' },
      { label: 'Average Revenue', value: 150, column: 'revenue', calculation: 'Mean of revenue' },
    ],
  }

  const columns: Column[] = mockDataset.metadata.columns
  const numericColumns = columns.filter(c => ['int', 'float'].includes(c.type))
  const categoryColumns = columns.filter(c => c.type === 'string')

  const mockApi = {
    request: vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    }),
  } as unknown as ApiClient

  it('renders KPI cards with labels and values', () => {
    render(
      <OverviewPage
        dataset={mockDataset}
        columns={columns}
        numericColumns={numericColumns}
        categoryColumns={categoryColumns}
        overviewFields={columns}
        rows={null}
        filters={{}}
        api={mockApi}
        showNotice={vi.fn()}
        onNavigate={vi.fn()}
      />
    )

    expect(screen.getByText('Records')).toBeInTheDocument()
    expect(screen.getByText('Average Revenue')).toBeInTheDocument()
  })

  it('computes and renders insights strip chips from real statistics', () => {
    render(
      <OverviewPage
        dataset={mockDataset}
        columns={columns}
        numericColumns={numericColumns}
        categoryColumns={categoryColumns}
        overviewFields={columns}
        rows={null}
        filters={{}}
        api={mockApi}
        showNotice={vi.fn()}
        onNavigate={vi.fn()}
      />
    )

    const strip = screen.getByRole('region', { name: 'Dataset insights' })
    expect(within(strip).getByText('revenue ↔ units')).toBeInTheDocument()
    expect(within(strip).getByText('revenue')).toBeInTheDocument()
    expect(within(strip).getByText('North America')).toBeInTheDocument()
  })
})
