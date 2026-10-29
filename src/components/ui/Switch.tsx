export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = '',
}: SwitchProps) {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

  return (
    <div className={`ui-switch-row ${disabled ? 'ui-switch-disabled' : ''} ${className}`.trim()}>
      {(label || description) && (
        <div className="ui-switch-info">
          {label && (
            <label htmlFor={switchId} className="ui-switch-label">
              {label}
            </label>
          )}
          {description && <span className="ui-switch-desc">{description}</span>}
        </div>
      )}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`ui-switch ${checked ? 'ui-switch-checked' : ''}`}
      >
        <span className="ui-switch-thumb" />
      </button>
    </div>
  )
}
