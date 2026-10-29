import type { ReportPreferences } from './types'

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const DEMO_SESSION = {
  access_token: 'demo-token',
  user: {
    email: 'demo@datalume.local',
    user_metadata: { full_name: 'Demo User' },
  },
} as const

export const DEFAULT_REPORT_PREFERENCES: ReportPreferences = {
  title: 'Analytics Report',
  numberFormat: 'standard',
  includeKpis: true,
  includeCharts: true,
  includePreview: true,
}

export const CHART_COLORS = ['#f47721', '#ffb66e', '#7c9b89', '#d7a5a0', '#7e8da4', '#f1cf79'] as const

export const COLOR_PALETTES = {
  sunset: {
    name: 'Sunset Warmth',
    primary: '#f47721',
    fill: '#ffe4c8',
    colors: ['#f47721', '#ff9f43', '#fdb863', '#e06666', '#d55e00', '#f1cf79'],
  },
  emerald: {
    name: 'Emerald Fresh',
    primary: '#2e7d32',
    fill: '#c8e6c9',
    colors: ['#2e7d32', '#43a047', '#66bb6a', '#81c784', '#a5d6a7', '#1b5e20'],
  },
  ocean: {
    name: 'Ocean Breeze',
    primary: '#0288d1',
    fill: '#b3e5fc',
    colors: ['#0288d1', '#03a9f4', '#29b6f6', '#4fc3f7', '#0097a7', '#00acc1'],
  },
  berry: {
    name: 'Berry Violet',
    primary: '#8e24aa',
    fill: '#f3e5f5',
    colors: ['#8e24aa', '#ab47bc', '#ba68c8', '#ce93d8', '#e91e63', '#d81b60'],
  },
} as const

export function loadReportPreferences(): ReportPreferences {
  try {
    const saved = localStorage.getItem('datalume-report-preferences')
    return saved ? { ...DEFAULT_REPORT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_REPORT_PREFERENCES
  } catch {
    return DEFAULT_REPORT_PREFERENCES
  }
}

export function loadUserProfile(): { fullName: string; email: string } {
  try {
    const saved = localStorage.getItem('datalume-user-profile')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        fullName: parsed.fullName || parsed.full_name || DEMO_SESSION.user.user_metadata.full_name,
        email: parsed.email || DEMO_SESSION.user.email,
      }
    }
  } catch {
    // ignore
  }
  return { fullName: DEMO_SESSION.user.user_metadata.full_name, email: DEMO_SESSION.user.email }
}
