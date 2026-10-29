import { useEffect } from 'react'
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react'

export interface ToastProps {
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  onDismiss?: () => void
  duration?: number
}

export function Toast({
  message,
  type = 'info',
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!duration || !onDismiss) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const icons = {
    info: <Info size={16} />,
    success: <CheckCircle2 size={16} />,
    warning: <AlertTriangle size={16} />,
    error: <AlertCircle size={16} />,
  }

  return (
    <div role="status" aria-live="polite" className={`panel ui-toast ui-toast-${type}`}>
      <span className="ui-toast-icon">{icons[type]}</span>
      <span className="ui-toast-msg">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ui-toast-close"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
