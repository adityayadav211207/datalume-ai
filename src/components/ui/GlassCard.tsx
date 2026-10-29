import type { HTMLAttributes, ReactNode } from 'react'

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  glow?: boolean
}

export function GlassCard({
  children,
  padding = 'md',
  interactive = false,
  glow = false,
  className = '',
  ...props
}: GlassCardProps) {
  const paddingClass =
    padding === 'none'
      ? 'ui-card-p-none'
      : padding === 'sm'
        ? 'ui-card-p-sm'
        : padding === 'lg'
          ? 'ui-card-p-lg'
          : 'ui-card-p-md'
  const interactiveClass = interactive ? 'ui-card-interactive' : ''
  const glowClass = glow ? 'ui-card-glow' : ''

  return (
    <div
      className={`panel ui-card ${paddingClass} ${interactiveClass} ${glowClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
