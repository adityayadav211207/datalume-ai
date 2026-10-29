import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChartPanel } from './ChartPanel'

describe('ChartPanel', () => {
  const defaultProps = {
    title: 'Category Share',
    kicker: 'COMPOSITION',
    rows: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }],
    kind: 'bar',
    emptyText: 'No data',
    fields: [{ name: 'category', type: 'string', missing: 0, missing_percent: 0, unique: 2 }],
    value: 'category',
    onChange: vi.fn(),
    label: 'Field',
  }

  it('renders title and kicker', () => {
    render(<ChartPanel {...defaultProps} />)
    expect(screen.getByText('Category Share')).toBeInTheDocument()
    expect(screen.getByText('COMPOSITION')).toBeInTheDocument()
  })

  it('renders loading skeleton when loading is true', () => {
    const { container } = render(<ChartPanel {...defaultProps} loading={true} />)
    const skeletons = container.querySelectorAll('.ui-skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error message when error is provided', () => {
    render(<ChartPanel {...defaultProps} error="Failed to fetch chart records" />)
    expect(screen.getByText('Chart unavailable')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch chart records')).toBeInTheDocument()
  })
})
