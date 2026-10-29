import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variantClass = `ui-btn-${variant}`
  const sizeClass = `ui-btn-${size}`
  const isDisabled = disabled || loading

  return (
    <button
      className={`ui-btn ${variantClass} ${sizeClass} ${loading ? 'ui-btn-loading' : ''} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? <Loader2 className="spin ui-btn-spinner" size={14} aria-hidden="true" /> : icon}
      {children && <span className="ui-btn-content">{children}</span>}
      {!loading && iconRight}
    </button>
  )
}
