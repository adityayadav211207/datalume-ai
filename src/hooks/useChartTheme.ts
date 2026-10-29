import { useMemo } from 'react'
import type { Theme } from './useTheme'

export function useChartTheme(explicitTheme?: Theme) {
  const activeTheme: Theme =
    explicitTheme ||
    (typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'midnight'
      ? 'midnight'
      : 'aurora')

  return useMemo(() => {
    if (activeTheme === 'midnight') {
      const accent = '#ff9f43'
      const teal = '#2dd4bf'
      const violet = '#a78bfa'
      const amber = '#fbbf24'
      const rose = '#f87171'
      const accentDeep = '#f47721'
      return {
        accent,
        teal,
        violet,
        amber,
        rose,
        primary: accent,
        muted: '#8e8e9e',
        grid: 'rgba(255, 255, 255, 0.10)',
        fill: 'rgba(255, 159, 67, 0.20)',
        tooltipBg: '#1e2235',
        tooltipBorder: 'rgba(255, 255, 255, 0.16)',
        sparkline: 'rgba(255, 159, 67, 0.8)',
        colors: [accent, teal, violet, amber, rose, accentDeep] as const,
      }
    }

    // aurora (light)
    const accent = '#f47721'
    const teal = '#0d9488'
    const violet = '#7c3aed'
    const amber = '#d97706'
    const rose = '#dc2626'
    const accentDeep = '#d96010'
    return {
      accent,
      teal,
      violet,
      amber,
      rose,
      primary: accent,
      muted: '#7a7068',
      grid: 'rgba(200, 190, 180, 0.25)',
      fill: 'rgba(244, 119, 33, 0.18)',
      tooltipBg: '#ffffff',
      tooltipBorder: 'rgba(200, 190, 180, 0.35)',
      sparkline: 'rgba(244, 119, 33, 0.75)',
      colors: [accent, teal, violet, amber, rose, accentDeep] as const,
    }
  }, [activeTheme])
}
