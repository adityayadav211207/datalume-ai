import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { Dataset, Filters, RowResult } from '../lib/types'
import type { ApiClient } from '../lib/api'

function getStorageKey(userKey?: string, workspaceKey: string = 'default') {
  if (userKey) {
    const cleanUser = userKey.replace(/[^a-zA-Z0-9_-]/g, '_')
    const cleanWs = workspaceKey.replace(/[^a-zA-Z0-9_-]/g, '_')
    return `datalume-active-dataset:${cleanUser}:${cleanWs}`
  }
  return 'datalume-active-dataset-id'
}

function loadPersistedDatasetId(userKey?: string, workspaceKey: string = 'default'): string | null {
  try {
    const key = getStorageKey(userKey, workspaceKey)
    const namespaced = localStorage.getItem(key)
    if (namespaced) return namespaced
    return localStorage.getItem('datalume-active-dataset-id')
  } catch {
    return null
  }
}

function persistDatasetId(id: string, userKey?: string, workspaceKey: string = 'default'): void {
  try {
    const key = getStorageKey(userKey, workspaceKey)
    localStorage.setItem(key, id)
    localStorage.setItem('datalume-active-dataset-id', id)
  } catch {
    // ignore
  }
}

function removePersistedDatasetId(userKey?: string, workspaceKey: string = 'default'): void {
  try {
    const key = getStorageKey(userKey, workspaceKey)
    localStorage.removeItem(key)
    localStorage.removeItem('datalume-active-dataset-id')
  } catch {
    // ignore
  }
}

export function useDatasets(
  api: ApiClient,
  showNotice: (msg: string) => void,
  onNavigateOverview?: () => void,
  userKey?: string,
  workspaceKey: string = 'default'
) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [rows, setRows] = useState<RowResult | null>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [page, setPage] = useState(1)
  const [tableSearch, setTableSearch] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'processing' | 'success'>('idle')
  const [lastUploadedDataset, setLastUploadedDataset] = useState<Dataset | null>(null)

  const clearUploadPreview = useCallback(() => {
    setLastUploadedDataset(null)
    setUploadStage('idle')
    setUploadProgress(null)
  }, [])

  // Fetch initial datasets list & automatically restore previously active dataset
  useEffect(() => {
    let isMounted = true
    setRestoring(true)
    api
      .request('/api/datasets')
      .then(async response => {
        if (!isMounted) return
        const entries = await response.json()
        const list: Dataset[] = entries.map((entry: Record<string, unknown>) => ({
          id: String(entry.id),
          name: String(entry.name),
          metadata: {
            row_count: Number(entry.row_count),
            column_count: Number(entry.column_count),
            columns: [],
            duplicate_rows: 0,
          },
        }))
        setDatasets(list)

        // Auto-restore previously active dataset belonging to user & workspace
        const savedId = loadPersistedDatasetId(userKey, workspaceKey)
        const toRestore = (savedId ? list.find(d => d.id === savedId) : null) || list[0]
        if (toRestore && isMounted) {
          setDataset(toRestore)
          persistDatasetId(toRestore.id, userKey, workspaceKey)
          try {
            const statRes = await api.request(`/api/datasets/${toRestore.id}/statistics`)
            const stat = await statRes.json()
            if (isMounted) {
              setDataset(prev =>
                prev?.id === toRestore.id ? { ...toRestore, statistics: stat, metadata: stat.metadata } : prev
              )
            }
          } catch {
            // Keep basic metadata if statistics fetch fails
          }
        }
      })
      .catch(error => {
        if (isMounted) showNotice(error.message)
      })
      .finally(() => {
        if (isMounted) setRestoring(false)
      })

    return () => {
      isMounted = false
    }
  }, [api, showNotice, userKey, workspaceKey])

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
        persistDatasetId(uploaded.id, userKey, workspaceKey)
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
    [api, showNotice, userKey, workspaceKey]
  )

  const dropzone = useDropzone({
    onDrop,
    onDropRejected: fileRejections => {
      const first = fileRejections[0]
      if (first) {
        const errorMsg = first.errors[0]?.message || 'File format not supported'
        showNotice(`Upload rejected: ${first.file.name} (${errorMsg})`)
      }
    },
    accept: {
      'text/csv': ['.csv', '.CSV'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.XLSX'],
      'application/vnd.ms-excel': ['.xls', '.XLS'],
      'application/pdf': ['.pdf', '.PDF'],
      'application/x-pdf': ['.pdf', '.PDF'],
      'application/acrobat': ['.pdf', '.PDF'],
    },
    maxFiles: 1,
    disabled: busy,
  })

  const selectDataset = useCallback(
    async (item: Dataset) => {
      // Cleanly switch dataset state to avoid stale KPI/chart flashes
      setDataset({
        id: item.id,
        name: item.name,
        metadata: item.metadata,
      })
      persistDatasetId(item.id, userKey, workspaceKey)
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
    [api, showNotice, onNavigateOverview, userKey, workspaceKey]
  )

  const refreshDataset = useCallback(async () => {
    if (!dataset) return
    setBusy(true)
    try {
      const statRes = await api.request(`/api/datasets/${dataset.id}/statistics`)
      const stat = await statRes.json()
      setDataset(prev =>
        prev?.id === dataset.id ? { ...prev, statistics: stat, metadata: stat.metadata } : prev
      )
      const analysisRes = await api.request(`/api/datasets/${dataset.id}/analysis`, {
        method: 'POST',
        body: JSON.stringify({ filters }),
      })
      const analysis = await analysisRes.json()
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
      showNotice('Dataset refreshed successfully.')
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Failed to refresh dataset')
    } finally {
      setBusy(false)
    }
  }, [dataset, api, filters, showNotice])

  const removeDataset = useCallback(
    async (targetId: string) => {
      try {
        await api.request(`/api/datasets/${targetId}`, { method: 'DELETE' })
        setDatasets(list => list.filter(item => item.id !== targetId))
        if (dataset?.id === targetId) {
          setDataset(null)
          removePersistedDatasetId(userKey, workspaceKey)
        }
        showNotice('Dataset deleted.')
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not delete the dataset.')
      }
    },
    [api, dataset?.id, showNotice, userKey, workspaceKey]
  )

  const deleteDataset = useCallback(async () => {
    if (!dataset) return
    await removeDataset(dataset.id)
  }, [dataset, removeDataset])

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
    restoring,
    refreshDataset,
    uploadProgress,
    uploadStage,
    lastUploadedDataset,
    clearUploadPreview,
    onDrop,
    dropzone,
    selectDataset,
    deleteDataset,
    removeDataset,
    exportCsv,
    columns,
    numericColumns,
    categoryColumns,
    overviewFields,
    filteredState,
  }
}
