import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedReportsPage } from './SavedReportsPage'
import type { Dataset, SavedDashboard } from '../lib/types'

const mockDatasets: Dataset[] = [
  {
    id: 'ds-100',
    name: 'E-commerce Orders',
    metadata: {
      row_count: 5000,
      column_count: 10,
      duplicate_rows: 0,
      columns: [],
    },
  },
]

const mockDashboards: SavedDashboard[] = [
  {
    id: 'rep-1',
    dataset_id: 'ds-100',
    name: 'Monthly Regional Sales',
    configuration: {
      chart_type: 'bar',
      filters: { region: { search: 'Europe' } },
    },
  },
  {
    id: 'rep-2',
    dataset_id: 'ds-100',
    name: 'Category Breakdown Donut',
    configuration: {
      chart_type: 'pie',
    },
  },
]

describe('SavedReportsPage component', () => {
  it('renders report cards with badges and dataset names', () => {
    render(
      <SavedReportsPage
        dashboards={mockDashboards}
        datasets={mockDatasets}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />
    )

    expect(screen.getByText('Monthly Regional Sales')).toBeInTheDocument()
    expect(screen.getByText('Category Breakdown Donut')).toBeInTheDocument()
    expect(screen.getAllByText('E-commerce Orders').length).toBe(2)
    expect(screen.getByText('bar view')).toBeInTheDocument()
    expect(screen.getByText('pie view')).toBeInTheDocument()
    expect(screen.getByText('1 active filter')).toBeInTheDocument()
  })

  it('filters reports via search input', async () => {
    const user = userEvent.setup()

    render(
      <SavedReportsPage
        dashboards={mockDashboards}
        datasets={mockDatasets}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />
    )

    const searchInput = screen.getByRole('textbox', { name: /search saved reports/i })
    await user.type(searchInput, 'Regional')

    expect(screen.getByText('Monthly Regional Sales')).toBeInTheDocument()
    expect(screen.queryByText('Category Breakdown Donut')).not.toBeInTheDocument()
  })

  it('triggers onOpen when Open Setup button is clicked', async () => {
    const user = userEvent.setup()
    const handleOpen = vi.fn()

    render(
      <SavedReportsPage
        dashboards={mockDashboards}
        datasets={mockDatasets}
        onOpen={handleOpen}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />
    )

    const openBtns = screen.getAllByRole('button', { name: /open setup/i })
    await user.click(openBtns[0])
    expect(handleOpen).toHaveBeenCalledWith(mockDashboards[0])
  })

  it('triggers onDuplicate when duplicate button is clicked', async () => {
    const user = userEvent.setup()
    const handleDuplicate = vi.fn()

    render(
      <SavedReportsPage
        dashboards={mockDashboards}
        datasets={mockDatasets}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={handleDuplicate}
        onDownload={vi.fn()}
      />
    )

    const dupBtn = screen.getByRole('button', { name: /duplicate Monthly Regional Sales/i })
    await user.click(dupBtn)
    expect(handleDuplicate).toHaveBeenCalledWith(mockDashboards[0])
  })

  it('allows renaming a report inline', async () => {
    const user = userEvent.setup()
    const handleRename = vi.fn()

    render(
      <SavedReportsPage
        dashboards={mockDashboards}
        datasets={mockDatasets}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onRename={handleRename}
        onDownload={vi.fn()}
      />
    )

    const renameBtn = screen.getByRole('button', { name: /rename Monthly Regional Sales/i })
    await user.click(renameBtn)

    const input = screen.getByDisplayValue('Monthly Regional Sales')
    await user.clear(input)
    await user.type(input, 'Q1 Regional Sales')

    const saveBtn = screen.getByRole('button', { name: /save new name/i })
    await user.click(saveBtn)

    expect(handleRename).toHaveBeenCalledWith('rep-1', 'Q1 Regional Sales')
  })

  it('shows confirmation when deleting a report', async () => {
    const user = userEvent.setup()
    const handleDelete = vi.fn()

    render(
      <SavedReportsPage
        dashboards={mockDashboards}
        datasets={mockDatasets}
        onOpen={vi.fn()}
        onDelete={handleDelete}
        onDownload={vi.fn()}
      />
    )

    const delBtn = screen.getByRole('button', { name: /delete Monthly Regional Sales/i })
    await user.click(delBtn)

    expect(screen.getByText('Delete report?')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i })
    await user.click(confirmBtn)
    expect(handleDelete).toHaveBeenCalledWith('rep-1')
  })
})
