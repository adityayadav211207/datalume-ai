import { useEffect, useState } from 'react'

export function useShell() {
  const [activePage, setActivePage] = useState('Overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [utilityPanel, setUtilityPanel] = useState<'help' | 'notifications' | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        setUtilityPanel(null)
        setChatOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  return {
    activePage,
    setActivePage,
    sidebarOpen,
    setSidebarOpen,
    utilityPanel,
    setUtilityPanel,
    chatOpen,
    setChatOpen,
  }
}
