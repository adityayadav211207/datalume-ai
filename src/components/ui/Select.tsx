import { forwardRef } from 'react'
import type { SelectHTMLAttributes, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  icon?: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, icon, id, className = '', ...props },
  ref
) {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`ui-field-wrap ${error ? 'ui-field-error' : ''} ${className}`.trim()}>
      {label && (
        <label htmlFor={selectId} className="ui-label">
          {label}
        </label>
      )}
      <div className="ui-select-container">
        {icon && <span className="ui-input-icon-left">{icon}</span>}
        <select
          ref={ref}
          id={selectId}
          className={`ui-select ${icon ? 'ui-input-has-left' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="ui-select-chevron" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </div>
      {error && (
        <p id={`${selectId}-error`} className="ui-hint ui-error-text" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${selectId}-hint`} className="ui-hint">
          {hint}
        </p>
      )}
    </div>
  )
})
