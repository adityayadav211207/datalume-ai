import { useCallback, useEffect, useState } from 'react'
import type { Dataset, Filters, SavedDashboard } from '../lib/types'
import type { ApiClient } from '../lib/api'

export function useDashboards(
  api: ApiClient,
  showNotice: (msg: string) => void,
  dataset: Dataset | null,
  datasets: Dataset[],
  selectDataset: (item: Dataset) => Promise<void>,
  setFilters: (filters: Filters) => void,
  setActivePage?: (page: string) => void
) {
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([])
  const [saveReportOpen, setSaveReportOpen] = useState(false)
  const [reportName, setReportName] = useState('')

  useEffect(() => {
    api
      .request('/api/dashboards')
      .then(response => response.json())
      .then(setSavedDashboards)
      .catch(error => showNotice(error.message))
  }, [api, showNotice])

  const saveDashboard = useCallback(
    async (configuration: Record<string, unknown>) => {
      if (!dataset) return
      const name = reportName.trim()
      if (!name) return
      try {
        const response = await api.request('/api/dashboards', {
          method: 'POST',
          body: JSON.stringify({
            dataset_id: dataset.id,
            name: name.trim(),
            configuration,
          }),
        })
        const saved = await response.json()
        setSavedDashboards(current => [saved, ...current])
        setSaveReportOpen(false)
        showNotice('Report configuration saved.')
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not save report.')
      }
    },
    [dataset, reportName, api, showNotice]
  )

  const removeDashboard = useCallback(
    async (id: string) => {
      try {
        await api.request(`/api/dashboards/${id}`, { method: 'DELETE' })
        setSavedDashboards(current => current.filter(item => item.id !== id))
        showNotice('Saved dashboard deleted.')
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not delete dashboard.')
      }
    },
    [api, showNotice]
  )

  const renameDashboard = useCallback(
    async (id: string, newName: string) => {
      const trimmed = newName.trim()
      if (!trimmed) return
      const target = savedDashboards.find(item => item.id === id)
      if (!target) return
      try {
        const response = await api.request(`/api/dashboards/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            dataset_id: target.dataset_id,
            name: trimmed,
            configuration: target.configuration,
          }),
        })
        const updated = await response.json()
        setSavedDashboards(current =>
          current.map(item => (item.id === id ? { ...item, ...updated, name: trimmed } : item))
        )
        showNotice('Report renamed.')
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not rename report.')
      }
    },
    [api, savedDashboards, showNotice]
  )

  const duplicateDashboard = useCallback(
    async (target: SavedDashboard) => {
      try {
        const copyName = `${target.name} (Copy)`
        const response = await api.request('/api/dashboards', {
          method: 'POST',
          body: JSON.stringify({
            dataset_id: target.dataset_id,
            name: copyName,
            configuration: target.configuration,
          }),
        })
        const saved = await response.json()
        setSavedDashboards(current => [saved, ...current])
        showNotice('Report duplicated.')
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not duplicate report.')
      }
    },
    [api, showNotice]
  )

  const openDashboard = useCallback(
    async (saved: SavedDashboard) => {
      const item = datasets.find(candidate => candidate.id === saved.dataset_id)
      if (!item) {
        showNotice('The dataset for this dashboard is no longer available.')
        return
      }
      await selectDataset(item)
      const configuration = saved.configuration
      if (configuration.filters && typeof configuration.filters === 'object') {
        setFilters(configuration.filters as Filters)
      }
      if (configuration.chart_type) {
        setActivePage?.('Visualizations')
      } else {
        setActivePage?.('Overview')
      }
      showNotice(`Restored report "${saved.name}".`)
    },
    [datasets, selectDataset, setFilters, setActivePage, showNotice]
  )

  return {
    savedDashboards,
    setSavedDashboards,
    saveReportOpen,
    setSaveReportOpen,
    reportName,
    setReportName,
    saveDashboard,
    removeDashboard,
    renameDashboard,
    duplicateDashboard,
    openDashboard,
  }
}
