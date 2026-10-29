import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { Dataset, Filters, RowResult } from '../lib/types'
import type { ApiClient } from '../lib/api'

export function useDatasets(
  api: ApiClient,
  showNotice: (msg: string) => void,
  onNavigateOverview?: () => void
) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [rows, setRows] = useState<RowResult | null>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)
  const [tableSearch, setTableSearch] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'processing' | 'success'>('idle')
  const [lastUploadedDataset, setLastUploadedDataset] = useState<Dataset | null>(null)

  const clearUploadPreview = useCallback(() => {
    setLastUploadedDataset(null)
    setUploadStage('idle')
    setUploadProgress(null)
  }, [])

  // Fetch initial datasets list
  useEffect(() => {
    api
      .request('/api/datasets')
      .then(async response => {
        const entries = await response.json()
        setDatasets(
          entries.map((entry: Record<string, unknown>) => ({
            id: String(entry.id),
            name: String(entry.name),
            metadata: {
              row_count: Number(entry.row_count),
              column_count: Number(entry.column_count),
              columns: [],
              duplicate_rows: 0,
            },
          }))
        )
      })
      .catch(error => showNotice(error.message))
  }, [api, showNotice])

  // Fetch dataset analysis on active dataset and filter change
  useEffect(() => {
    if (!dataset) return
    api
      .request(`/api/datasets/${dataset.id}/analysis`, {
        method: 'POST',
        body: JSON.stringify({ filters }),
      })
      .then(response => response.json())
      .then(analysis => {
        setDataset(current =>
          current?.id === dataset.id
            ? {
                ...current,
                statistics: analysis.statistics,
                metadata: analysis.statistics.metadata,
                kpis: analysis.kpis,
              }
            : current
        )
      })
      .catch(error => showNotice(error.message))
  }, [dataset?.id, filters, api, showNotice])

  // Fetch tabular rows on dataset, filter, page, or search change
  useEffect(() => {
    if (!dataset) {
      setRows(null)
      return
    }
    api
      .request(`/api/datasets/${dataset.id}/query`, {
        method: 'POST',
        body: JSON.stringify({ filters, page, page_size: 50, search: tableSearch || undefined }),
      })
      .then(response => response.json())
      .then(setRows)
      .catch(error => showNotice(error.message))
  }, [dataset?.id, filters, page, tableSearch, api, showNotice])

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return
      if (file.size > 25 * 1024 * 1024) {
        showNotice('Files must be 25 MB or smaller.')
        return
      }
      const data = new FormData()
      data.append('file', file)
      setBusy(true)
      setUploadStage('uploading')
      setUploadProgress(0)
      try {
        const response = await api.upload('/api/datasets/upload', data, pct => {
          setUploadProgress(pct)
          if (pct >= 100) {
            setUploadStage('processing')
          }
        })
        const uploaded: Dataset = await response.json()
        setUploadProgress(100)
        setUploadStage('success')
        setDataset(uploaded)
        setLastUploadedDataset(uploaded)
        setDatasets(current => [uploaded, ...current])
        setFilters({})
        setPage(1)
        showNotice(`${file.name} uploaded and analyzed successfully.`)
      } catch (error) {
        setUploadStage('idle')
        setUploadProgress(null)
        showNotice(error instanceof Error ? error.message : 'Upload failed.')
      } finally {
        setBusy(false)
      }
    },
    [api, showNotice]
  )

  const dropzone = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: busy,
  })

  const selectDataset = useCallback(
    async (item: Dataset) => {
      setDataset(item)
      setFilters({})
      setPage(1)
      onNavigateOverview?.()
      try {
        const response = await api.request(`/api/datasets/${item.id}/statistics`)
        const stat = await response.json()
        setDataset({ ...item, statistics: stat, metadata: stat.metadata })
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not restore this dataset.')
      }
    },
    [api, showNotice, onNavigateOverview]
  )

  const deleteDataset = useCallback(async () => {
    if (!dataset) return
    try {
      await api.request(`/api/datasets/${dataset.id}`, { method: 'DELETE' })
      setDatasets(list => list.filter(item => item.id !== dataset.id))
      setDataset(null)
      showNotice('Dataset deleted.')
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Could not delete the dataset.')
    }
  }, [dataset, api, showNotice])

  const exportCsv = useCallback(async () => {
    if (!dataset) return
    try {
      const response = await api.request(`/api/datasets/${dataset.id}/export`, {
        method: 'POST',
        body: JSON.stringify({ filters }),
      })
      const data = await response.json()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([data.content], { type: 'text/csv' }))
      link.download = data.filename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Export failed.')
    }
  }, [dataset, filters, api, showNotice])

  const columns = dataset?.metadata.columns || []
  const numericColumns = columns.filter(column =>
    ['int64', 'float64', 'int32', 'float32', 'number', 'int', 'float'].some(type =>
      column.type.toLowerCase().includes(type)
    )
  )
  const categoryColumns = columns.filter(
    column =>
      !numericColumns.some(numeric => numeric.name === column.name) &&
      column.type.toLowerCase() !== 'datetime'
  )
  const overviewFields = [...categoryColumns, ...numericColumns]
  const filteredState = Object.keys(filters).length > 0

  return {
    datasets,
    setDatasets,
    dataset,
    setDataset,
    rows,
    filters,
    setFilters,
    page,
    setPage,
    tableSearch,
    setTableSearch,
    search,
    setSearch,
    busy,
    uploadProgress,
    uploadStage,
    lastUploadedDataset,
    clearUploadPreview,
    onDrop,
    dropzone,
    selectDataset,
    deleteDataset,
    exportCsv,
    columns,
    numericColumns,
    categoryColumns,
    overviewFields,
    filteredState,
  }
}
