import type { ReactNode } from 'react'

export interface SegmentOption {
  value: string
  label: string
  icon?: ReactNode
}

export interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  size?: 'sm' | 'md'
  className?: string
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps) {
  return (
    <div
      role="radiogroup"
      className={`ui-segmented ui-segmented-${size} ${className}`.trim()}
    >
      {options.map(opt => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`ui-segment-btn ${isSelected ? 'ui-segment-active' : ''}`}
          >
            {opt.icon && <span className="ui-segment-icon">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
