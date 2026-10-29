import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from './DataTable'
import type { RowResult } from '../lib/types'

describe('DataTable component', () => {
  it('renders empty message when rows is null or has no columns', () => {
    const { rerender } = render(<DataTable rows={null} />)
    expect(screen.getByText('No records to show.')).toBeInTheDocument()

    rerender(<DataTable rows={{ columns: [], rows: [], total: 0, page: 1, page_size: 10 }} />)
    expect(screen.getByText('No records to show.')).toBeInTheDocument()
  })

  it('renders column headers and row data', () => {
    const mockRows: RowResult = {
      columns: ['name', 'amount'],
      rows: [
        { name: 'Alpha', amount: 100 },
        { name: 'Beta', amount: 200 },
      ],
      total: 2,
      page: 1,
      page_size: 10,
    }

    render(<DataTable rows={mockRows} />)

    expect(screen.getByRole('button', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /amount/i })).toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders null or empty values as —', () => {
    const mockRows: RowResult = {
      columns: ['name', 'amount'],
      rows: [{ name: 'Gamma', amount: null }],
      total: 1,
      page: 1,
      page_size: 10,
    }

    render(<DataTable rows={mockRows} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('toggles column sort when header button is clicked', async () => {
    const user = userEvent.setup()
    const mockRows: RowResult = {
      columns: ['amount'],
      rows: [{ amount: 50 }, { amount: 10 }],
      total: 2,
      page: 1,
      page_size: 10,
    }

    render(<DataTable rows={mockRows} />)
    const headerBtn = screen.getByRole('button', { name: /amount/i })

    // Click 1: sort asc
    await user.click(headerBtn)
    expect(headerBtn).toHaveTextContent('↑')

    // Click 2: sort desc
    await user.click(headerBtn)
    expect(headerBtn).toHaveTextContent('↓')
  })
})
