import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconRight?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, iconRight, id, className = '', ...props },
  ref
) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`ui-field-wrap ${error ? 'ui-field-error' : ''} ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label}
        </label>
      )}
      <div className="ui-input-container">
        {icon && <span className="ui-input-icon-left">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`ui-input ${icon ? 'ui-input-has-left' : ''} ${iconRight ? 'ui-input-has-right' : ''}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {iconRight && <span className="ui-input-icon-right">{iconRight}</span>}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="ui-hint ui-error-text" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="ui-hint">
          {hint}
        </p>
      )}
    </div>
  )
})
