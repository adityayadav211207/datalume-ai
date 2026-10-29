import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyPanel } from './EmptyPanel'

describe('EmptyPanel component', () => {
  it('renders title and custom description text', () => {
    render(<EmptyPanel text="Select a column to generate an overview." />)

    expect(screen.getByText('No chart to show yet')).toBeInTheDocument()
    expect(
      screen.getByText('Select a column to generate an overview.')
    ).toBeInTheDocument()
  })

  it('has the chart-empty container class', () => {
    const { container } = render(<EmptyPanel text="Empty info" />)
    expect(container.firstChild).toHaveClass('chart-empty')
  })
})
