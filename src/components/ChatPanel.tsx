import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart2,
  Check,
  ChevronRight,
  Copy,
  Database,
  Send,
  ShieldCheck,
  Sparkles,
  Table,
  Trash2,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react'
import type { ChatMessage, Dataset } from '../lib/types'

export function chatFactEntries(facts: Record<string, unknown>) {
  const entries: { label: string; value: string }[] = []
  const visit = (value: unknown, label: string) => {
    if (value === null || value === undefined) return
    if (typeof value === 'number') {
      entries.push({
        label,
        value: new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value),
      })
    } else if (Array.isArray(value)) {
      entries.push({ label, value: value.map(String).join(', ') })
    } else if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      if (label === 'metadata') {
        entries.push({ label: 'Rows', value: String(record.row_count ?? '—') })
        entries.push({ label: 'Columns', value: String(record.column_count ?? '—') })
        entries.push({ label: 'Duplicate rows', value: String(record.duplicate_rows ?? '—') })
        return
      }
      Object.entries(record).forEach(([key, nested]) => visit(nested, label ? `${label} · ${key}` : key))
    } else {
      entries.push({ label, value: String(value) })
    }
  }
  Object.entries(facts).forEach(([key, value]) => visit(value, key))
  return entries
}

/** Rich facts component: renders tables, mini-sparklines, and pills */
function RenderMessageFacts({ facts }: { facts: Record<string, unknown> }) {
  // 1. Missing values by column -> Mini table with horizontal sparkline bars
  if (facts.missing_by_column && typeof facts.missing_by_column === 'object') {
    const missingEntries = Object.entries(facts.missing_by_column as Record<string, number>)
    const maxMissing = Math.max(...missingEntries.map(([, count]) => count), 1)

    return (
      <div className="lumi-facts-container">
        <div className="lumi-fact-table-header">
          <Table size={12} />
          <span>Missing Values by Column</span>
        </div>
        <table className="lumi-fact-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Missing</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {missingEntries.map(([col, count]) => {
              const pct = Math.min(100, Math.round((count / maxMissing) * 100))
              return (
                <tr key={col}>
                  <td className="col-name">{col}</td>
                  <td className="col-val">{count.toLocaleString()}</td>
                  <td className="col-bar-cell">
                    <div className="lumi-mini-bar-track">
                      <div className="lumi-mini-bar-fill warning-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {facts.duplicate_rows !== undefined && (
          <div className="lumi-fact-pill-row">
            <span className="lumi-fact-pill">
              Duplicate rows: <strong>{String(facts.duplicate_rows)}</strong>
            </span>
          </div>
        )}
      </div>
    )
  }

  // 2. Averages or Totals -> Mini Table with relative value sparkline bars
  if ((facts.averages || facts.totals) && typeof (facts.averages || facts.totals) === 'object') {
    const isAverage = Boolean(facts.averages)
    const data = (facts.averages || facts.totals) as Record<string, number>
    const entries = Object.entries(data)
    const maxVal = Math.max(...entries.map(([, v]) => Math.abs(Number(v) || 0)), 1)

    return (
      <div className="lumi-facts-container">
        <div className="lumi-fact-table-header">
          <TrendingUp size={12} />
          <span>{isAverage ? 'Column Averages' : 'Column Totals'}</span>
        </div>
        <table className="lumi-fact-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>{isAverage ? 'Average' : 'Total'}</th>
              <th>Magnitude</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([col, val]) => {
              const num = Number(val) || 0
              const pct = Math.min(100, Math.round((Math.abs(num) / maxVal) * 100))
              return (
                <tr key={col}>
                  <td className="col-name">{col}</td>
                  <td className="col-val">
                    {new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(num)}
                  </td>
                  <td className="col-bar-cell">
                    <div className="lumi-mini-bar-track">
                      <div className="lumi-mini-bar-fill accent-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // 3. Numeric statistics -> Multi-column summary table (min, mean, max)
  if (facts.numeric && typeof facts.numeric === 'object') {
    const cols = Object.entries(
      facts.numeric as Record<string, { mean?: number; min?: number; max?: number }>
    )
    return (
      <div className="lumi-facts-container">
        <div className="lumi-fact-table-header">
          <BarChart2 size={12} />
          <span>Numeric Distribution Summary</span>
        </div>
        <table className="lumi-fact-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Min</th>
              <th>Mean</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            {cols.map(([col, stat]) => (
              <tr key={col}>
                <td className="col-name">{col}</td>
                <td className="col-val">{stat.min != null ? Number(stat.min).toFixed(1) : '—'}</td>
                <td className="col-val">{stat.mean != null ? Number(stat.mean).toFixed(1) : '—'}</td>
                <td className="col-val">{stat.max != null ? Number(stat.max).toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // 4. Columns list -> Badge cloud
  if (Array.isArray(facts.columns) && facts.columns.length > 0) {
    return (
      <div className="lumi-facts-container">
        <div className="lumi-fact-chips-title">
          <span>{facts.columns.length} Columns in dataset</span>
        </div>
        <div className="lumi-col-chips-wrap">
          {facts.columns.map((c, i) => (
            <span key={i} className="lumi-col-chip">
              {String(c)}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // 5. Fallback: structured KPI pills grid
  const standardEntries = chatFactEntries(facts)
  if (!standardEntries.length) return null

  return (
    <div className="chat-facts">
      {standardEntries.map((fact, factIndex) => (
        <div className="chat-fact" key={`${fact.label}-${factIndex}`}>
          <span>{fact.label}</span>
          <strong>{fact.value}</strong>
        </div>
      ))}
    </div>
  )
}

export function ChatPanel({
  dataset,
  messages,
  suggestions,
  clear,
  input,
  setInput,
  busy,
  send,
  close,
}: {
  dataset: Dataset | null
  messages: ChatMessage[]
  suggestions: string[]
  clear: () => void
  input: string
  setInput: (value: string) => void
  busy: boolean
  send: (question?: string) => void
  close: () => void
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopyMessage = async (msg: ChatMessage, index: number) => {
    let text = msg.content
    if (msg.facts && Object.keys(msg.facts).length > 0) {
      const factLines = chatFactEntries(msg.facts)
        .map(f => `${f.label}: ${f.value}`)
        .join('\n')
      text = `${text}\n\nFacts:\n${factLines}`
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      // Fallback
    }
  }

  // Default quick prompt chips
  const quickChips = [
    'Row count',
    'Column names',
    'Data quality',
    'Column averages',
    'Correlations',
    'Full summary',
  ]

  return (
    <motion.aside
      className="chat-panel"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.22 }}
    >
      <header className="chat-header">
        <span className="lumi-mark">
          <Sparkles size={17} />
        </span>
        <span>
          <strong>Lumi AI</strong>
          <small>
            <i /> YOUR DATA ASSISTANT
          </small>
        </span>
        <span className="chat-header-spacer" />
        <button type="button" title="Clear chat" onClick={clear} aria-label="Clear chat">
          <Trash2 size={16} />
        </button>
        <button type="button" title="Close assistant" onClick={close} aria-label="Close assistant">
          <X size={17} />
        </button>
      </header>

      <div className="chat-dataset">
        <Database size={14} />{' '}
        {dataset ? (
          <>
            <span>Using</span>
            <strong>{dataset.name}</strong>
          </>
        ) : (
          <span>Upload a dataset to begin</span>
        )}
      </div>

      <div className="chat-messages">
        {!messages.length && (
          <div className="chat-welcome">
            <span className="lumi-welcome-icon">
              <Sparkles size={20} />
            </span>
            <h3>Hi! I'm Lumi.</h3>
            <p>
              Ask me anything about <strong>{dataset?.name || 'your dataset'}</strong>. I perform exact
              calculations directly from your active data.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={index}>
            <span className="message-avatar">
              {message.role === 'assistant' ? <Sparkles size={13} /> : <UserRound size={13} />}
            </span>
            <div className="message-body-wrap">
              <div className="message-role">
                <span>{message.role === 'assistant' ? 'Lumi' : 'You'}</span>
                {message.role === 'assistant' && <span className="calc-badge">CALCULATED</span>}

                {message.role === 'assistant' && (
                  <button
                    type="button"
                    className="message-copy-btn"
                    title="Copy message to clipboard"
                    aria-label="Copy message"
                    onClick={() => handleCopyMessage(message, index)}
                  >
                    {copiedIndex === index ? (
                      <span className="copied-inline">
                        <Check size={12} /> Copied!
                      </span>
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
              <p>{message.content}</p>
              {message.facts && Object.keys(message.facts).length > 0 && (
                <RenderMessageFacts facts={message.facts} />
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="chat-message assistant">
            <span className="message-avatar">
              <Sparkles size={13} />
            </span>
            <div className="message-body-wrap">
              <div className="message-role">
                <span>Lumi</span>
                <span className="calc-badge pulse-badge">THINKING</span>
              </div>
              <div className="chat-typing-indicator">
                <span className="typing-dot dot-1" />
                <span className="typing-dot dot-2" />
                <span className="typing-dot dot-3" />
                <span className="typing-text">Lumi is analyzing your data...</span>
              </div>
            </div>
          </div>
        )}

        {dataset && suggestions.length > 0 && !busy && (
          <div className="chat-suggestion-followups">
            <div className="suggestion-label">
              {messages.length ? 'ASK ABOUT THIS DATASET' : 'SUGGESTED QUESTIONS'}
            </div>
            <div className="suggestions">
              {suggestions.map(suggestion => (
                <button type="button" key={suggestion} onClick={() => send(suggestion)}>
                  <span>{suggestion}</span>
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Quick Chips */}
      {dataset && !busy && (
        <div className="chat-quick-chips-bar" aria-label="Quick questions">
          <span className="quick-chips-label">Quick:</span>
          <div className="quick-chips-scroll">
            {quickChips.map(chip => (
              <button
                type="button"
                key={chip}
                className="quick-chip-btn"
                onClick={() => send(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        className="chat-compose"
        onSubmit={event => {
          event.preventDefault()
          send()
        }}
      >
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
          placeholder="Ask a question about your data..."
          rows={2}
        />
        <div className="compose-footer">
          <span>
            <ShieldCheck size={13} /> Answers use calculated data
          </span>
          <button type="submit" disabled={!input.trim() || busy} aria-label="Send question">
            <Send size={15} />
          </button>
        </div>
      </form>
      <div className="chat-disclaimer">Lumi only uses your active dataset and filters.</div>
    </motion.aside>
  )
}

