import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
  className = '',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="ui-drawer-backdrop"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Drawer panel'}
        className={`panel ui-drawer ui-drawer-${side} ui-drawer-${size} ${className}`.trim()}
      >
        <div className="ui-drawer-header">
          {title && <h3 className="ui-drawer-title">{title}</h3>}
          <button
            type="button"
            className="ui-icon-btn ui-drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="ui-drawer-body">{children}</div>
      </div>
    </div>
  )
}
