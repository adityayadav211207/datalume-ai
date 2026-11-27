export interface Column {
  name: string
  type: string
  missing: number
  missing_percent: number
  unique: number
}

export interface PdfTableInfo {
  id: string
  name: string
  page: number
  row_count: number
  column_count: number
  columns: string[]
  preview: Record<string, unknown>[]
}

export interface PdfDocumentInfo {
  doc_type: 'structured_tables' | 'mixed_content' | 'text_document' | 'scanned_document'
  metadata: {
    title: string
    author: string
    subject: string
    creator: string
    producer: string
    total_pages: number
    processed_pages: number
    word_count: number
    has_scanned_pages: boolean
    total_images: number
  }
  tables: PdfTableInfo[]
  can_combine_tables: boolean
  document_text_snippet?: string
}

export interface Dataset {
  id: string
  name: string
  file_type?: string
  pdf_info?: PdfDocumentInfo
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
