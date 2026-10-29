import type { useDropzone } from 'react-dropzone'
import {
  Check,
  ChevronRight,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'
import type { Dataset } from '../lib/types'

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
  return (
    <div className="welcome-view">
      <div className="welcome-intro">
        <div className="eyebrow">
          <span className="eyebrow-dot" /> YOUR PERSONAL ANALYTICS STUDIO
        </div>
        <h1>
          Turn Your Data
          <br />
          Into <em>Decisions.</em>
        </h1>
        <p>Upload a dataset, ask better questions, and find the details that move your work forward.</p>
        <button className="button-primary" type="button" onClick={onOpenUpload}>
          <UploadCloud size={17} /> Upload a dataset
        </button>
        <span className="welcome-note">
          <ShieldCheck size={14} /> Private by design. Yours alone.
        </span>
      </div>
      <div
        {...dropzone.getRootProps()}
        className={`welcome-drop ${dropzone.isDragActive ? 'drop-active' : ''}`}
      >
        <input {...dropzone.getInputProps()} />
        <span className="drop-icon">
          <UploadCloud size={23} />
        </span>
        <strong>
          {busy
            ? 'Analyzing your dataset...'
            : dropzone.isDragActive
            ? 'Drop it right here'
            : 'Drop a file to begin'}
        </strong>
        <span>
          CSV, XLSX or XLS <i /> UP TO 25 MB
        </span>
        <button
          type="button"
          onClick={event => {
            event.stopPropagation()
            dropzone.open()
          }}
        >
          Browse files <ChevronRight size={14} />
        </button>
        <div className="drop-formats">
          <FileSpreadsheet size={16} />
          <span>CSV</span>
          <span className="format-sep">/</span>
          <span>XLSX</span>
          <span className="format-sep">/</span>
          <span>XLS</span>
        </div>
      </div>
      <div className="welcome-lower">
        <section className="welcome-recent">
          <div className="section-label">
            <span>RECENT DATASETS</span>
            <span className="section-rule" />
            <span className="recent-count">{datasets.length}</span>
          </div>
          {datasets.length ? (
            <div className="recent-list">
              {datasets.slice(0, 4).map(item => (
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
                  <span className="recent-time">READY</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          ) : (
            <div className="recent-empty">
              <Database size={19} />
              <span>Your datasets will appear here once you upload a file.</span>
            </div>
          )}
        </section>
        <section className="quick-start">
          <div className="section-label">
            <span>YOUR FIRST ANALYSIS</span>
          </div>
          <div className="quick-step">
            <span>01</span>
            <div>
              <strong>Upload a dataset</strong>
              <small>Start with a CSV or spreadsheet.</small>
            </div>
            <Check size={15} />
          </div>
          <div className="quick-step">
            <span>02</span>
            <div>
              <strong>Review what matters</strong>
              <small>We’ll profile columns, gaps and metrics.</small>
            </div>
            <span className="step-line" />
          </div>
          <div className="quick-step">
            <span>03</span>
            <div>
              <strong>Ask Lumi AI</strong>
              <small>Explore your dataset in plain language.</small>
            </div>
            <span className="step-line" />
          </div>
        </section>
      </div>
      <div className="welcome-decoration">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
