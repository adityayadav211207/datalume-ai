import type { useDropzone } from 'react-dropzone'
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Layers,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Table,
  UploadCloud,
} from 'lucide-react'
import type { Dataset } from '../lib/types'

interface UploadPageProps {
  dropzone: ReturnType<typeof useDropzone>
  busy: boolean
  datasets: Dataset[]
  onSelect: (item: Dataset) => void
  uploadProgress?: number | null
  uploadStage?: 'idle' | 'uploading' | 'processing' | 'success'
  lastUploadedDataset?: Dataset | null
  onClearPreview?: () => void
  onNavigate?: (page: string) => void
}

export function UploadPage({
  dropzone,
  busy,
  datasets,
  onSelect,
  uploadProgress,
  uploadStage = 'idle',
  lastUploadedDataset,
  onClearPreview,
  onNavigate,
}: UploadPageProps) {
  // If we just uploaded a dataset, render the Profile Preview Card
  if (lastUploadedDataset) {
    const meta = lastUploadedDataset.metadata
    const cols = meta.columns || []
    const numCount = cols.filter(c =>
      ['int', 'float', 'number', 'decimal'].some(t => c.type.toLowerCase().includes(t))
    ).length
    const dateCount = cols.filter(c =>
      ['date', 'time', 'timestamp'].some(t => c.type.toLowerCase().includes(t))
    ).length
    const textCount = cols.length - numCount - dateCount

    const avgMissing =
      cols.length > 0
        ? Math.round(
            (cols.reduce((sum, c) => sum + (c.missing_percent || 0), 0) / cols.length) * 10
          ) / 10
        : 0

    return (
      <div className="upload-view" data-testid="upload-preview-view">
        <div className="eyebrow">
          <span className="eyebrow-dot" /> INGESTION COMPLETE
        </div>
        <h1>
          Dataset Profile <em>Preview</em>
        </h1>
        <p className="upload-sub">
          <strong>{lastUploadedDataset.name}</strong> has been parsed, indexed, and profiled.
        </p>

        {/* Profile Preview Card */}
        <div className="profile-preview-card panel">
          <div className="preview-card-head">
            <div className="preview-card-title">
              <span className="preview-success-icon">
                <CheckCircle2 size={24} />
              </span>
              <div>
                <h2>{lastUploadedDataset.name}</h2>
                <span className="preview-meta-tag">
                  {cols.length} Columns · {meta.row_count.toLocaleString()} Rows · Indexed & Ready
                </span>
              </div>
            </div>

            <button
              type="button"
              className="button-secondary preview-new-upload-btn"
              onClick={onClearPreview}
            >
              <Plus size={14} /> Upload another file
            </button>
          </div>

          {/* 4 Profile KPI Cards */}
          <div className="preview-kpi-grid">
            <div className="preview-kpi-item">
              <div className="preview-kpi-label">TOTAL ROWS</div>
              <div className="preview-kpi-val">{meta.row_count.toLocaleString()}</div>
              <div className="preview-kpi-sub">Clean indexed records</div>
            </div>

            <div className="preview-kpi-item">
              <div className="preview-kpi-label">TOTAL COLUMNS</div>
              <div className="preview-kpi-val">{meta.column_count}</div>
              <div className="preview-kpi-sub">
                {numCount} Numeric, {textCount} Categorical{dateCount ? `, ${dateCount} Date` : ''}
              </div>
            </div>

            <div className="preview-kpi-item">
              <div className="preview-kpi-label">AVG MISSING RATE</div>
              <div className={`preview-kpi-val ${avgMissing > 5 ? 'val-warning' : 'val-good'}`}>
                {avgMissing}%
              </div>
              <div className="preview-kpi-sub">
                {avgMissing < 1 ? 'High data completeness' : 'Contains nulls/blanks'}
              </div>
            </div>

            <div className="preview-kpi-item">
              <div className="preview-kpi-label">DUPLICATE ROWS</div>
              <div className="preview-kpi-val">
                {meta.duplicate_rows ? meta.duplicate_rows.toLocaleString() : '0'}
              </div>
              <div className="preview-kpi-sub">Identical duplicate records</div>
            </div>
          </div>

          {/* Column Breakdown Pills */}
          <div className="preview-cols-section">
            <div className="preview-section-title">
              <Layers size={14} /> Ingested Fields & Inferred Schema
            </div>
            <div className="preview-cols-scroll">
              {cols.map(c => {
                const isNum = ['int', 'float', 'number'].some(t => c.type.toLowerCase().includes(t))
                const isDate = ['date', 'time'].some(t => c.type.toLowerCase().includes(t))
                return (
                  <div key={c.name} className="preview-col-pill">
                    <span className="col-pill-name">{c.name}</span>
                    <span className={`col-pill-type ${isNum ? 'type-num' : isDate ? 'type-date' : 'type-txt'}`}>
                      {isNum ? 'NUM' : isDate ? 'DATE' : 'TXT'}
                    </span>
                    <span className="col-pill-missing">
                      {c.missing > 0 ? `${c.missing_percent}% missing` : '100% complete'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Navigation */}
          <div className="preview-actions">
            <button
              type="button"
              className="button-primary preview-action-btn"
              onClick={() => onNavigate && onNavigate('Data Explorer')}
            >
              <Table size={16} /> Explore in Data Explorer <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="button-secondary preview-action-btn"
              onClick={() => onNavigate && onNavigate('Visualizations')}
            >
              <BarChart3 size={16} /> Open Visualizations
            </button>
            <button
              type="button"
              className="button-secondary preview-action-btn"
              onClick={() => onNavigate && onNavigate('Overview')}
            >
              <Database size={16} /> Overview Studio
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Determine current dropzone animation state
  const isDrag = dropzone.isDragActive
  const isUploading = busy || uploadStage === 'uploading' || uploadStage === 'processing'
  const isProcessing = uploadStage === 'processing'

  return (
    <div className="upload-view" data-testid="upload-page">
      <div className="eyebrow">
        <span className="eyebrow-dot" /> DATA IN, CLARITY OUT
      </div>
      <h1>
        Bring your data <em>into focus.</em>
      </h1>
      <p className="upload-sub">Files are processed securely and attached to your personal workspace.</p>

      {/* Animated Dropzone */}
      <div
        {...dropzone.getRootProps()}
        className={`large-drop animated-dropzone ${
          isDrag ? 'drop-active' : ''
        } ${isUploading ? 'drop-uploading' : ''}`}
        tabIndex={0}
      >
        <input {...dropzone.getInputProps()} />

        {isUploading ? (
          <div className="uploading-state-wrap">
            <span className="drop-icon upload-spin-icon">
              {isProcessing ? (
                <Sparkles size={32} className="pulse-sparkle" />
              ) : (
                <LoaderCircle size={32} className="spin" />
              )}
            </span>

            <strong className="upload-progress-title">
              {isProcessing
                ? 'Profiling dataset schema & calculating statistics...'
                : `Uploading dataset (${uploadProgress ?? 0}%)...`}
            </strong>

            <p className="upload-progress-sub">
              {isProcessing
                ? 'Analyzing distributions, column completeness, and correlations.'
                : 'Streaming bytes securely to local server.'}
            </p>

            {/* Progress Bar (Real or Honest Indeterminate) */}
            <div className="upload-track">
              <div
                className={`upload-progress-fill ${isProcessing ? 'indeterminate-shimmer' : ''}`}
                style={{
                  width: isProcessing ? '100%' : `${Math.max(5, uploadProgress ?? 0)}%`,
                }}
              />
            </div>

            <span className="upload-progress-pct">
              {isProcessing ? 'Finalizing analysis...' : `${uploadProgress ?? 0}%`}
            </span>
          </div>
        ) : (
          <>
            <span className="drop-icon idle-float">
              <UploadCloud size={28} />
            </span>
            <strong>
              {isDrag ? 'Release to upload dataset' : 'Drag and drop a dataset here'}
            </strong>
            <span className="drop-browse-prompt">
              or <u>browse files from your computer</u>
            </span>
            <div className="upload-specs">
              <span>
                <Check size={13} /> CSV
              </span>
              <span>
                <Check size={13} /> XLSX
              </span>
              <span>
                <Check size={13} /> XLS
              </span>
              <i /> Max file size 25 MB
            </div>
          </>
        )}
      </div>

      <div className="upload-security">
        <ShieldCheck size={17} />
        <span>
          <strong>Your files stay private.</strong> Dataset files are processed locally in a private,
          owner-scoped storage boundary.
        </span>
      </div>

      {/* Existing Datasets List */}
      {datasets.length > 0 && (
        <section className="upload-existing">
          <div className="section-label">
            <span>YOUR DATASETS ({datasets.length})</span>
            <span className="section-rule" />
          </div>
          <div className="existing-datasets-grid">
            {datasets.map(item => (
              <button
                type="button"
                className="recent-row"
                key={item.id}
                onClick={() => onSelect(item)}
              >
                <span className="recent-file-icon">
                  <FileSpreadsheet size={17} />
                </span>
                <span className="recent-file-meta">
                  <strong>{item.name}</strong>
                  <small>
                    {item.metadata.row_count.toLocaleString()} records <i />{' '}
                    {item.metadata.column_count} fields
                  </small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
