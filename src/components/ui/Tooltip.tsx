import { useState, type ReactNode } from 'react'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false)

  if (!content) return <>{children}</>

  return (
    <div
      className={`ui-tooltip-wrap ${className}`.trim()}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div role="tooltip" className={`ui-tooltip-bubble ui-tooltip-${placement}`}>
          {content}
        </div>
      )}
    </div>
  )
}
