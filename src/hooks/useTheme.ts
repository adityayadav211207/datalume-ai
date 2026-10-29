import { useCallback, useEffect, useState } from 'react'

export const THEMES = ['midnight', 'aurora'] as const
export type Theme = (typeof THEMES)[number]

function detectInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('datalume-theme') as Theme | null
    if (saved && (THEMES as readonly string[]).includes(saved)) {
      return saved
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'midnight' : 'aurora'
  }
  return 'aurora'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(detectInitialTheme)

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    try {
      localStorage.setItem('datalume-theme', newTheme)
    } catch {
      // ignore
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'midnight' ? 'aurora' : 'midnight')
  }, [theme, setTheme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return { theme, setTheme, toggleTheme }
}
