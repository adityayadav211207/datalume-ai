import type { useDropzone } from 'react-dropzone'
import {
  ArrowRight,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Workflow,
} from 'lucide-react'
import type { Dataset } from '../lib/types'
import { GlassCard } from './ui'

export function WelcomeView({
  dropzone,
  busy,
  datasets,
  onSelect,
  onOpenUpload,
}: {
  dropzone: ReturnType<typeof useDropzone>
  busy: boolean
  datasets: Dataset[]
  onSelect: (item: Dataset) => void
  onOpenUpload: () => void
}) {
  void [Database, onOpenUpload]

  return (
    <div className="welcome-view-premium">
      {/* 1. DATA PIPELINE SECTION (TOP) */}
      <section className="pipeline-container" aria-label="Data Pipeline Workflow">
        <div className="pipeline-header">
          <div className="pipeline-header-icon-wrap">
            <Workflow size={22} className="pipeline-header-icon" />
          </div>
          <div>
            <h2 className="pipeline-heading">Data Pipeline</h2>
            <p className="pipeline-subtitle">
              From raw data to actionable insights — a complete, automated workflow.
            </p>
          </div>
        </div>

        <div className="pipeline-flow">
          {/* Stage 01 — Upload Your Data */}
          <div className="pipeline-card">
            <div className="pipeline-icon">
              <UploadCloud size={28} />
            </div>
            <div className="pipeline-card-content">
              <div className="pipeline-card-header">
                <span className="pipeline-step-num">01</span>
                <h3 className="pipeline-step-title">Upload Your Data</h3>
              </div>
              <p className="pipeline-step-desc">Upload CSV, XLSX, XLS, or PDF files.</p>
            </div>
          </div>

          {/* Minimalist Orange Connecting Arrow */}
          <div className="pipeline-arrow-container" aria-hidden="true">
            <ArrowRight size={22} className="pipeline-arrow" />
          </div>

          {/* Stage 02 — Automatic Profiling */}
          <div className="pipeline-card">
            <div className="pipeline-icon">
              <Layers size={28} />
            </div>
            <div className="pipeline-card-content">
              <div className="pipeline-card-header">
                <span className="pipeline-step-num">02</span>
                <h3 className="pipeline-step-title">Automatic Profiling</h3>
              </div>
              <p className="pipeline-step-desc">
                Extract tables, identify data types, analyze missing values, and process document content.
              </p>
            </div>
          </div>

          {/* Minimalist Orange Connecting Arrow */}
          <div className="pipeline-arrow-container" aria-hidden="true">
            <ArrowRight size={22} className="pipeline-arrow" />
          </div>

          {/* Stage 03 — Ask Lumi AI */}
          <div className="pipeline-card">
            <div className="pipeline-icon">
              <Sparkles size={28} />
            </div>
            <div className="pipeline-card-content">
              <div className="pipeline-card-header">
                <span className="pipeline-step-num">03</span>
                <h3 className="pipeline-step-title">Ask Lumi AI</h3>
              </div>
              <p className="pipeline-step-desc">
                Discover insights, generate summaries, visualize data, and ask questions about your documents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WELCOME HEADING & DESCRIPTION */}
      <div className="welcome-header-section">
        <div className="welcome-eyebrow">
          <span className="eyebrow-accent-dot" /> ENTERPRISE ANALYTICS WORKSPACE
        </div>
        <h1 className="welcome-headline">
          Welcome to <span className="welcome-brand-text">DataLume AI</span>
        </h1>
        <p className="welcome-subtext">
          Connect your data to begin uncovering actionable insights, intelligent column profiling, and
          AI-driven analytics.
        </p>
      </div>

      {/* 3. DATASET DRAG-AND-DROP UPLOAD CONTAINER */}
      <GlassCard
        className={`welcome-drop-card glass-card ${dropzone.isDragActive ? 'drop-active' : ''}`}
        padding="lg"
        {...dropzone.getRootProps()}
      >
        <input {...dropzone.getInputProps()} />
        <div className="drop-center-content">
          <div className="drop-icon-orb">
            <UploadCloud size={30} className="upload-icon" />
          </div>

          <h2 className="drop-main-prompt">
            {busy
              ? 'Analyzing and profiling dataset...'
              : dropzone.isDragActive
              ? 'Drop file here to upload'
              : 'Drag & drop your dataset here'}
          </h2>

          <p className="drop-limits-text">
            Supports <strong className="limit-format">CSV</strong>,{' '}
            <strong className="limit-format">XLSX</strong>,{' '}
            <strong className="limit-format">XLS</strong>, or{' '}
            <strong className="limit-format">PDF</strong> files up to 25 MB
          </p>

          <button
            type="button"
            className="browse-files-btn"
            disabled={busy}
            onClick={event => {
              event.stopPropagation()
              dropzone.open()
            }}
          >
            <Plus size={15} /> Browse Files
          </button>

          {/* 4. SUPPORTED FILE FORMATS AND SECURITY INFO */}
          <div className="format-pills-row">
            <span className="format-pill">
              <FileSpreadsheet size={13} /> CSV
            </span>
            <span className="format-pill">
              <FileSpreadsheet size={13} /> XLSX
            </span>
            <span className="format-pill">
              <FileSpreadsheet size={13} /> XLS
            </span>
            <span className="format-pill">
              <FileSpreadsheet size={13} /> PDF
            </span>
            <span className="security-pill">
              <ShieldCheck size={13} /> Local & In-Memory Analysis
            </span>
          </div>
        </div>
      </GlassCard>

      {/* 5. RECENT DATASETS QUICK-ACCESS (IF ANY EXIST) */}
      {datasets && datasets.length > 0 && (
        <GlassCard className="welcome-recent-card glass-card" padding="md">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">AVAILABLE IN WORKSPACE</div>
              <h2>Previous Datasets ({datasets.length})</h2>
            </div>
          </div>
          <div className="recent-datasets-grid">
            {datasets.slice(0, 4).map(item => {
              const ext = item.name.split('.').pop()?.toUpperCase() || 'CSV'
              return (
                <div
                  key={item.id}
                  className="recent-dataset-item"
                  onClick={() => onSelect(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelect(item)}
                >
                  <div className="recent-item-left">
                    <span className="recent-ext-badge">{ext}</span>
                    <div className="recent-item-meta">
                      <strong>{item.name}</strong>
                      <span>
                        {item.metadata.row_count.toLocaleString()} rows · {item.metadata.column_count} fields
                      </span>
                    </div>
                  </div>
                  <div className="recent-item-right">
                    <span className="switch-prompt">
                      Restore <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
