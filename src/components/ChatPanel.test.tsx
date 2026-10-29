import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPanel } from './ChatPanel'
import type { Dataset, ChatMessage } from '../lib/types'

const mockDataset: Dataset = {
  id: 'ds-1',
  name: 'Test Sales Data',
  metadata: {
    row_count: 1500,
    column_count: 5,
    duplicate_rows: 2,
    columns: [
      { name: 'region', type: 'string', missing: 0, missing_percent: 0, unique: 4 },
      { name: 'sales', type: 'float', missing: 3, missing_percent: 0.2, unique: 120 },
    ],
  },
}

describe('ChatPanel component', () => {
  it('renders quick suggestion chips and fires send on click', async () => {
    const user = userEvent.setup()
    const handleSend = vi.fn()

    render(
      <ChatPanel
        dataset={mockDataset}
        messages={[]}
        suggestions={['What is the total revenue?']}
        clear={vi.fn()}
        input=""
        setInput={vi.fn()}
        busy={false}
        send={handleSend}
        close={vi.fn()}
      />
    )

    // Check quick chips
    const rowCountChip = screen.getByRole('button', { name: 'Row count' })
    expect(rowCountChip).toBeInTheDocument()

    await user.click(rowCountChip)
    expect(handleSend).toHaveBeenCalledWith('Row count')

    // Check suggestions list
    const suggestionBtn = screen.getByRole('button', { name: /What is the total revenue\?/i })
    expect(suggestionBtn).toBeInTheDocument()
    await user.click(suggestionBtn)
    expect(handleSend).toHaveBeenCalledWith('What is the total revenue?')
  })

  it('renders typing indicator when busy is true', () => {
    render(
      <ChatPanel
        dataset={mockDataset}
        messages={[]}
        suggestions={[]}
        clear={vi.fn()}
        input=""
        setInput={vi.fn()}
        busy={true}
        send={vi.fn()}
        close={vi.fn()}
      />
    )

    expect(screen.getByText('Lumi is analyzing your data...')).toBeInTheDocument()
    expect(screen.getByText('THINKING')).toBeInTheDocument()
  })

  it('renders assistant message with copy button and rich facts table', async () => {
    const user = userEvent.setup()
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    })

    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: 'Here are the column averages for your dataset.',
        facts: {
          averages: {
            sales: 450.25,
            profit: 120.75,
          },
        },
      },
    ]

    render(
      <ChatPanel
        dataset={mockDataset}
        messages={messages}
        suggestions={[]}
        clear={vi.fn()}
        input=""
        setInput={vi.fn()}
        busy={false}
        send={vi.fn()}
        close={vi.fn()}
      />
    )

    expect(screen.getByText('Here are the column averages for your dataset.')).toBeInTheDocument()
    expect(screen.getByText('Column Averages')).toBeInTheDocument()
    expect(screen.getByText('sales')).toBeInTheDocument()
    expect(screen.getByText('profit')).toBeInTheDocument()

    // Copy message
    const copyBtn = screen.getByRole('button', { name: /copy message/i })
    expect(copyBtn).toBeInTheDocument()
    await user.click(copyBtn)
    expect(writeTextMock).toHaveBeenCalled()
  })

  it('renders missing values fact table correctly', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: 'Data quality analysis complete.',
        facts: {
          missing_by_column: {
            customer_email: 14,
            phone_number: 85,
          },
          duplicate_rows: 3,
        },
      },
    ]

    render(
      <ChatPanel
        dataset={mockDataset}
        messages={messages}
        suggestions={[]}
        clear={vi.fn()}
        input=""
        setInput={vi.fn()}
        busy={false}
        send={vi.fn()}
        close={vi.fn()}
      />
    )

    expect(screen.getByText('Missing Values by Column')).toBeInTheDocument()
    expect(screen.getByText('customer_email')).toBeInTheDocument()
    expect(screen.getByText('phone_number')).toBeInTheDocument()
    expect(screen.getByText(/Duplicate rows:/i)).toBeInTheDocument()
  })
})
