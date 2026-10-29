import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowDownToLine,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileSpreadsheet,
  LoaderCircle,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import type { OverviewChartState } from './pages/OverviewPage'
import { ApiClient } from './lib/api'
import { getChatSuggestions } from './lib/suggestions'

import { useToast } from './hooks/useToast'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import { useShell } from './hooks/useShell'
import { useDatasets } from './hooks/useDatasets'
import { useConversations } from './hooks/useConversations'
import { useDashboards } from './hooks/useDashboards'
import { useReports } from './hooks/useReports'

import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { WelcomeView } from './components/WelcomeView'
import { FilterBar } from './components/FilterBar'
import { ChatPanel } from './components/ChatPanel'
import { CommandPalette } from './components/CommandPalette'

import { OverviewPage } from './pages/OverviewPage'
import { UploadPage } from './pages/UploadPage'
import { ExplorerPage } from './pages/ExplorerPage'
import { VisualizationPage } from './pages/VisualizationPage'
import { SavedReportsPage } from './pages/SavedReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UiKitPage } from './pages/UiKitPage'

import './css/tokens.css'
import './css/base.css'
import './css/glass.css'
import './css/layout.css'
import './css/charts.css'
import './css/pages.css'
import './css/ui-kit.css'

export function normalizeChatContent(value: unknown): string {
  if (typeof value === 'string') {
    return value === '[object Object]' ? 'This older reply could not be displayed. Please ask Lumi again.' : value
  }
  if (value && typeof value === 'object') {
    const response = value as Record<string, unknown>
    for (const key of ['answer', 'content', 'message', 'text']) {
      if (response[key] !== undefined) return normalizeChatContent(response[key])
    }
    return Object.entries(response)
      .map(([key, item]) => `${key}: ${normalizeChatContent(item)}`)
      .join('\n')
  }
  return value === null || value === undefined ? '' : String(value)
}

export default function App() {
  const toast = useToast()
  const auth = useAuth(toast.showNotice)
  const shell = useShell()
  const { theme, toggleTheme } = useTheme()
  const [isUiKit, setIsUiKit] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#ui-kit'
  )
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const handleHashChange = () => {
      setIsUiKit(window.location.hash === '#ui-kit')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(open => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const api = useMemo(
    () => new ApiClient(auth.token, toast.showNotice),
    [auth.token, toast.showNotice]
  )

  const handleNavigateOverview = useCallback(() => {
    shell.setActivePage('Overview')
  }, [shell])

  const datasets = useDatasets(api, toast.showNotice, handleNavigateOverview)

  const conversations = useConversations(
    api,
    toast.showNotice,
    datasets.dataset,
    datasets.filters,
    datasets.datasets,
    datasets.selectDataset,
    datasets.setDataset,
    () => shell.setChatOpen(true)
  )

  const dashboards = useDashboards(
    api,
    toast.showNotice,
    datasets.dataset,
    datasets.datasets,
    datasets.selectDataset,
    datasets.setFilters,
    shell.setActivePage
  )

  const reports = useReports(toast.showNotice)

  const [overviewState, setOverviewState] = useState<OverviewChartState | null>(null)

  const handleDownloadReport = useCallback(() => {
    reports.downloadReport({
      dataset: datasets.dataset,
      rows: datasets.rows,
      filters: datasets.filters,
      chartRows: overviewState?.chartRows,
      categoryShareRows: overviewState?.categoryShareRows,
      comparisonRows: overviewState?.comparisonRows,
      histogramRows: overviewState?.histogramRows,
    })
  }, [reports, datasets.dataset, datasets.rows, datasets.filters, overviewState])

  const handleSaveDashboardSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      dashboards.saveDashboard({
        filters: datasets.filters,
        overview_category: overviewState?.overviewCategory,
        share_category: overviewState?.shareCategory,
        comparison_category: overviewState?.comparisonCategory,
        comparison_metric: overviewState?.comparisonMetric,
        histogram_metric: overviewState?.histogramMetric,
        scatter_x: overviewState?.scatterXAxis,
        scatter_y: overviewState?.scatterYAxis,
      })
    },
    [dashboards, datasets.filters, overviewState]
  )

  const handleAskLumiFromPalette = useCallback(
    (query: string) => {
      conversations.setChatInput(query)
      shell.setChatOpen(true)
    },
    [conversations, shell]
  )

  const recentActivity = useMemo(
    () =>
      [
        ...datasets.datasets.slice(0, 3).map(item => ({
          id: `dataset-${item.id}`,
          title: 'Dataset ready',
          detail: `${item.name} · ${item.metadata.row_count.toLocaleString()} records`,
          action: () => {
            datasets.selectDataset(item)
            shell.setUtilityPanel(null)
          },
        })),
        ...dashboards.savedDashboards.slice(0, 2).map(item => ({
          id: `report-${item.id}`,
          title: 'Saved report',
          detail: item.name,
          action: () => {
            shell.setActivePage('Saved Reports')
            shell.setUtilityPanel(null)
          },
        })),
        ...conversations.conversations.slice(0, 2).map(item => ({
          id: `chat-${item.id}`,
          title: 'Lumi conversation',
          detail: item.title,
          action: () => {
            conversations.reopenConversation(item)
            shell.setUtilityPanel(null)
          },
        })),
      ].slice(0, 6),
    [datasets, dashboards.savedDashboards, conversations, shell]
  )

  if (isUiKit) {
    return (
      <ErrorBoundary>
        <div className="bg-orbs" aria-hidden="true">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>
        <UiKitPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onExit={() => {
            window.location.hash = ''
            setIsUiKit(false)
          }}
        />
      </ErrorBoundary>
    )
  }

  if (!auth.authReady) {
    return (
      <div className="boot">
        <LoaderCircle className="spin" /> Preparing your workspace
      </div>
    )
  }

  const { dataset } = datasets

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <div className="bg-orbs" aria-hidden="true">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>

        <Sidebar
          sidebarOpen={shell.sidebarOpen}
          setSidebarOpen={shell.setSidebarOpen}
          activePage={shell.activePage}
          setActivePage={shell.setActivePage}
          setChatOpen={shell.setChatOpen}
          userName={auth.userName}
          userEmail={auth.userEmail}
          datasets={datasets.datasets}
          dataset={dataset}
          selectDataset={datasets.selectDataset}
          search={datasets.search}
          conversations={conversations.conversations}
          conversationId={conversations.conversationId}
          reopenConversation={conversations.reopenConversation}
          renameConversation={conversations.renameConversation}
          removeConversation={conversations.removeConversation}
          setUtilityPanel={shell.setUtilityPanel}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        <main className="main-area">
          <Topbar
            sidebarOpen={shell.sidebarOpen}
            setSidebarOpen={shell.setSidebarOpen}
            activePage={shell.activePage}
            search={datasets.search}
            setSearch={datasets.setSearch}
            utilityPanel={shell.utilityPanel}
            setUtilityPanel={shell.setUtilityPanel}
            userName={auth.userName}
            theme={theme}
            toggleTheme={toggleTheme}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            currentDataset={dataset}
          />

          <section className="content-area">
            <AnimatePresence mode="wait">
              <motion.div
                key={shell.activePage + (dataset ? `-${dataset.id}` : '')}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {shell.activePage === 'Settings' ? (
              <SettingsPage
                email={auth.userEmail}
                userName={auth.userName}
                preferences={reports.reportPreferences}
                onChange={reports.updateReportPreferences}
                onUpdateProfile={auth.handleUpdateProfile}
                onSignOut={() => toast.showNotice('Demo mode is active.')}
              />
            ) : shell.activePage === 'Saved Reports' ? (
              <SavedReportsPage
                dashboards={dashboards.savedDashboards}
                datasets={datasets.datasets}
                onOpen={dashboards.openDashboard}
                onDelete={dashboards.removeDashboard}
                onRename={dashboards.renameDashboard}
                onDuplicate={dashboards.duplicateDashboard}
                onDownload={handleDownloadReport}
              />
            ) : shell.activePage === 'Upload Dataset' ? (
              <UploadPage
                dropzone={datasets.dropzone}
                busy={datasets.busy}
                datasets={datasets.datasets}
                onSelect={datasets.selectDataset}
                uploadProgress={datasets.uploadProgress}
                uploadStage={datasets.uploadStage}
                lastUploadedDataset={datasets.lastUploadedDataset}
                onClearPreview={datasets.clearUploadPreview}
                onNavigate={shell.setActivePage}
              />
            ) : dataset ? (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      <span className="eyebrow-dot" /> YOUR ANALYTICS WORKSPACE
                    </div>
                    <h1>{shell.activePage}</h1>
                    <p>
                      Explore {dataset.name} with interactive analysis grounded in your data.
                    </p>
                  </div>
                  <div className="heading-actions">
                    <div className="dataset-select-wrap">
                      <FileSpreadsheet size={16} />
                      <select
                        aria-label="Active dataset selector"
                        value={dataset.id}
                        onChange={event => {
                          const item = datasets.datasets.find(
                            candidate => candidate.id === event.target.value
                          )
                          if (item) datasets.selectDataset(item)
                        }}
                      >
                        {datasets.datasets.map(item => (
                          <option value={item.id} key={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => {
                        dashboards.setReportName(`${dataset.name} analysis report`)
                        dashboards.setSaveReportOpen(true)
                      }}
                    >
                      <Check size={14} /> Save report
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={handleDownloadReport}
                    >
                      <ArrowDownToLine size={14} /> Download report
                    </button>
                    <button
                      className="button-primary"
                      type="button"
                      onClick={() => shell.setActivePage('Upload Dataset')}
                    >
                      <Plus size={16} /> New dataset
                    </button>
                  </div>
                </div>

                <div className="dataset-ribbon">
                  <div className="ribbon-file">
                    <span className="file-icon">
                      <FileSpreadsheet size={18} />
                    </span>
                    <span>
                      <strong>{dataset.name}</strong>
                      <small>
                        <span className="status-indicator" /> ANALYZED JUST NOW
                      </small>
                    </span>
                  </div>
                  <div className="ribbon-stat">
                    <span>Records</span>
                    <strong>{dataset.metadata.row_count.toLocaleString()}</strong>
                  </div>
                  <div className="ribbon-stat">
                    <span>Fields</span>
                    <strong>{dataset.metadata.column_count}</strong>
                  </div>
                  <div className="ribbon-stat">
                    <span>Duplicates</span>
                    <strong>{dataset.metadata.duplicate_rows ?? '—'}</strong>
                  </div>
                  <button
                    className="ribbon-action"
                    type="button"
                    onClick={datasets.exportCsv}
                  >
                    <ArrowDownToLine size={15} /> Export CSV
                  </button>
                  <button
                    className="ribbon-delete"
                    type="button"
                    title="Delete dataset"
                    onClick={datasets.deleteDataset}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {datasets.columns.length > 0 && (
                  <FilterBar
                    columns={datasets.columns}
                    numericColumns={datasets.numericColumns}
                    filters={datasets.filters}
                    setFilters={datasets.setFilters}
                    filtered={datasets.filteredState}
                  />
                )}

                {shell.activePage === 'Data Explorer' ? (
                  <ExplorerPage
                    rows={datasets.rows}
                    dataset={dataset}
                    page={datasets.page}
                    setPage={datasets.setPage}
                    tableSearch={datasets.tableSearch}
                    setTableSearch={datasets.setTableSearch}
                    onExport={datasets.exportCsv}
                    filters={datasets.filters}
                    setFilters={datasets.setFilters}
                    showNotice={toast.showNotice}
                  />
                ) : shell.activePage === 'Visualizations' ? (
                  <VisualizationPage
                    dataset={dataset}
                    columns={datasets.columns}
                    numericColumns={datasets.numericColumns}
                    categoryColumns={datasets.categoryColumns}
                    filters={datasets.filters}
                    onCrossFilter={(column, value) => {
                      datasets.setFilters({
                        ...datasets.filters,
                        [column]: { search: value },
                      })
                      toast.showNotice(`Filtered by chart: ${column} = ${value}`)
                    }}
                    request={(path, init) => api.request(path, init)}
                    showNotice={toast.showNotice}
                  />
                ) : (
                  <OverviewPage
                    dataset={dataset}
                    columns={datasets.columns}
                    numericColumns={datasets.numericColumns}
                    categoryColumns={datasets.categoryColumns}
                    overviewFields={datasets.overviewFields}
                    rows={datasets.rows}
                    filters={datasets.filters}
                    api={api}
                    showNotice={toast.showNotice}
                    onNavigate={shell.setActivePage}
                    onStateChange={setOverviewState}
                  />
                )}
              </>
            ) : (
              <WelcomeView
                dropzone={datasets.dropzone}
                busy={datasets.busy}
                datasets={datasets.datasets}
                onSelect={datasets.selectDataset}
                onOpenUpload={() => shell.setActivePage('Upload Dataset')}
              />
            )}
              </motion.div>
            </AnimatePresence>
          </section>

          <footer className="app-footer">
            <span>
              <span className="footer-mark">
                <Activity size={12} />
              </span>{' '}
              DATALUME AI <span className="footer-sep">/</span> ILLUMINATE YOUR DATA. DISCOVER
              YOUR INSIGHTS.
            </span>
            <span>
              SECURE ANALYSIS <ShieldCheck size={13} />
            </span>
          </footer>
        </main>

        <AnimatePresence>
          {shell.chatOpen && (
            <ChatPanel
              dataset={dataset}
              messages={conversations.messages}
              suggestions={getChatSuggestions(dataset)}
              clear={conversations.clearChat}
              input={conversations.chatInput}
              setInput={conversations.setChatInput}
              busy={conversations.chatBusy}
              send={conversations.sendChat}
              close={() => shell.setChatOpen(false)}
            />
          )}
        </AnimatePresence>

        {!shell.chatOpen && (
          <button
            className="chat-fab"
            type="button"
            onClick={() => shell.setChatOpen(true)}
            aria-label="Open Lumi AI"
          >
            <span className="fab-spark">
              <Sparkles size={15} />
            </span>
            <MessageCircle size={19} />
            <span className="fab-pulse" />
          </button>
        )}

        <AnimatePresence>
          {toast.notice && (
            <motion.div
              className="toast"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <span className="toast-mark">
                <Check size={14} />
              </span>
              {toast.notice}
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => toast.setNotice('')}
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {shell.utilityPanel && (
            <motion.div
              className="utility-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onMouseDown={event => {
                if (event.target === event.currentTarget) shell.setUtilityPanel(null)
              }}
            >
              <section
                className="utility-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="utility-panel-title"
              >
                <header>
                  <span className="utility-icon">
                    {shell.utilityPanel === 'help' ? (
                      <CircleHelp size={17} />
                    ) : (
                      <Activity size={17} />
                    )}
                  </span>
                  <div>
                    <strong id="utility-panel-title">
                      {shell.utilityPanel === 'help' ? 'Quick guide' : 'Workspace activity'}
                    </strong>
                    <small>
                      {shell.utilityPanel === 'help'
                        ? 'Common tasks in DataLume'
                        : 'Recent work in this demo session'}
                    </small>
                  </div>
                  <button
                    type="button"
                    aria-label="Close panel"
                    onClick={() => shell.setUtilityPanel(null)}
                  >
                    <X size={17} />
                  </button>
                </header>
                {shell.utilityPanel === 'help' ? (
                  <div className="utility-content">
                    <div className="guide-step">
                      <span>01</span>
                      <div>
                        <strong>Load a dataset</strong>
                        <small>
                          Upload a CSV or spreadsheet, or select one from Recent datasets.
                        </small>
                        <button
                          type="button"
                          onClick={() => {
                            shell.setActivePage('Upload Dataset')
                            shell.setUtilityPanel(null)
                          }}
                        >
                          Open upload <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="guide-step">
                      <span>02</span>
                      <div>
                        <strong>Explore the dashboard</strong>
                        <small>
                          Use the field selectors on each chart to change which columns are
                          plotted. Filters update the charts and KPIs.
                        </small>
                        <button
                          type="button"
                          onClick={() => {
                            shell.setActivePage('Overview')
                            shell.setUtilityPanel(null)
                          }}
                        >
                          Open overview <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="guide-step">
                      <span>03</span>
                      <div>
                        <strong>Create a report</strong>
                        <small>
                          Save the current chart setup or download a formatted report. Use
                          Print / Save PDF from the downloaded report.
                        </small>
                        <button
                          type="button"
                          onClick={() => {
                            shell.setActivePage(dataset ? 'Overview' : 'Saved Reports')
                            shell.setUtilityPanel(null)
                          }}
                        >
                          View reports <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="guide-step">
                      <span>04</span>
                      <div>
                        <strong>Ask Lumi</strong>
                        <small>
                          Open the assistant and choose a dataset-specific prompt or ask in
                          English or Hinglish.
                        </small>
                        <button
                          type="button"
                          onClick={() => {
                            shell.setChatOpen(true)
                            shell.setUtilityPanel(null)
                          }}
                        >
                          Open Lumi <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="utility-content">
                    {recentActivity.length ? (
                      recentActivity.map(item => (
                        <button
                          className="activity-item"
                          type="button"
                          key={item.id}
                          onClick={item.action}
                        >
                          <span className="activity-dot" />
                          <span>
                            <strong>{item.title}</strong>
                            <small>{item.detail}</small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))
                    ) : (
                      <div className="utility-empty">
                        <Activity size={20} />
                        <strong>No recent activity</strong>
                        <small>Uploaded datasets and saved reports will appear here.</small>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {dashboards.saveReportOpen && (
            <motion.div
              className="report-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <form className="report-modal" onSubmit={handleSaveDashboardSubmit}>
                <div className="report-modal-header">
                  <span className="settings-icon">
                    <FileSpreadsheet size={17} />
                  </span>
                  <div>
                    <strong>Save report</strong>
                    <small>Save this dataset and chart configuration</small>
                  </div>
                  <button
                    type="button"
                    aria-label="Close save report dialog"
                    onClick={() => dashboards.setSaveReportOpen(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <label>
                  Report name
                  <input
                    autoFocus
                    maxLength={120}
                    value={dashboards.reportName}
                    onChange={event => dashboards.setReportName(event.target.value)}
                  />
                </label>
                <div className="report-modal-actions">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => dashboards.setSaveReportOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button-primary"
                    type="submit"
                    disabled={!dashboards.reportName.trim()}
                  >
                    Save report
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {shell.sidebarOpen && (
          <button
            className="mobile-scrim"
            type="button"
            aria-label="Close navigation"
            onClick={() => shell.setSidebarOpen(false)}
          />
        )}

        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={shell.setActivePage}
          datasets={datasets.datasets}
          onSelectDataset={datasets.selectDataset}
          savedDashboards={dashboards.savedDashboards}
          onAskLumi={handleAskLumiFromPalette}
        />
      </div>
    </ErrorBoundary>
  )
}
