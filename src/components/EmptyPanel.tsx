import { BarChart3 } from 'lucide-react'

export function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="chart-empty">
      <span>
        <BarChart3 size={20} />
      </span>
      <strong>No chart to show yet</strong>
      <small>{text}</small>
    </div>
  )
}
