export interface Column {
  name: string
  type: string
  missing: number
  missing_percent: number
  unique: number
}

export interface Dataset {
  id: string
  name: string
  metadata: {
    row_count: number
    column_count: number
    columns: Column[]
    duplicate_rows: number
  }
  statistics?: {
    numeric: Record<string, Record<string, number | null>>
    categorical: Record<string, { value: string; count: number }[]>
    metadata?: {
      row_count: number
      column_count: number
      columns: Column[]
      duplicate_rows: number
    }
    correlations?: Record<string, Record<string, number | null>>
  }
  kpis?: {
    label: string
    value: number
    column: string | null
    calculation: string
  }[]
}

export interface RowResult {
  rows: Record<string, unknown>[]
  total: number
  page: number
  page_size: number
  columns: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  facts?: Record<string, unknown>
}

export interface Conversation {
  id: string
  dataset_id: string | null
  title: string
  updated_at: string
}

export interface ReportPreferences {
  title: string
  numberFormat: 'standard' | 'compact'
  includeKpis: boolean
  includeCharts: boolean
  includePreview: boolean
}

export interface FilterSpec {
  min?: number
  max?: number
  search?: string
  values?: string[]
  start_date?: string
  end_date?: string
}

export type Filters = Record<string, FilterSpec>

export type PaletteKey = 'sunset' | 'emerald' | 'ocean' | 'berry'

export type ChartType =
  | 'bar'
  | 'horizontal-bar'
  | 'area'
  | 'line'
  | 'pie'
  | 'donut'
  | 'histogram'
  | 'scatter'
  | 'heatmap'
  | 'boxplot'
  | 'radar'
  | 'missing'
  | 'treemap'

export interface SavedDashboard {
  id: string
  dataset_id: string
  name: string
  configuration: Record<string, unknown>
}
