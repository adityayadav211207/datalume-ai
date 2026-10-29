import { useState } from 'react'
import {
  GlassCard,
  Button,
  IconButton,
  Input,
  Select,
  Switch,
  SegmentedControl,
  Tabs,
  Badge,
  Tooltip,
  Modal,
  Drawer,
  Skeleton,
  EmptyState,
  Toast,
  ConfirmDialog,
} from '../components/ui'
import {
  Sparkles,
  ArrowLeft,
  Bell,
  Search,
  Settings,
  Database,
  BarChart2,
  Trash2,
  ExternalLink,
  Sun,
  Moon,
  FolderOpen,
} from 'lucide-react'

interface UiKitPageProps {
  theme: 'midnight' | 'aurora'
  onToggleTheme: () => void
  onExit: () => void
}

export function UiKitPage({ theme, onToggleTheme, onExit }: UiKitPageProps) {
  // Component demo states
  const [btnLoading, setBtnLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState('option-1')
  const [switchChecked, setSwitchChecked] = useState(true)
  const [segmentValue, setSegmentValue] = useState('chart')
  const [activeTab, setActiveTab] = useState('tab-1')

  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning' | 'error'>('info')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-6) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onExit}>
              Back to App
            </Button>
            <Badge variant="accent">Dev Showcase</Badge>
          </div>
          <h1 style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-3xl)', color: 'var(--ink)' }}>
            DataLume UI Kit
          </h1>
          <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 'var(--text-sm)' }}>
            16 accessible, glassmorphic design system components for DataLume AI.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={theme === 'midnight' ? <Sun size={14} /> : <Moon size={14} />}
            onClick={onToggleTheme}
          >
            Switch to {theme === 'midnight' ? 'Aurora' : 'Midnight'}
          </Button>
        </div>
      </div>

      {/* Grid of Component Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
        {/* 1. Buttons */}
        <GlassCard>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>
            1. Buttons & IconButtons
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button size="sm" variant="primary">Small</Button>
              <Button size="md" variant="primary">Medium</Button>
              <Button size="lg" variant="primary">Large</Button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Button
                variant="primary"
                loading={btnLoading}
                icon={<Sparkles size={14} />}
                onClick={() => {
                  setBtnLoading(true)
                  setTimeout(() => setBtnLoading(false), 1500)
                }}
              >
                Click for Loading
              </Button>
              <Button variant="secondary" disabled>Disabled</Button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', paddingTop: 'var(--space-2)' }}>
              <IconButton icon={<Bell size={16} />} label="Notifications" variant="ghost" />
              <IconButton icon={<Search size={16} />} label="Search" variant="secondary" />
              <IconButton icon={<Settings size={16} />} label="Settings" variant="primary" />
              <IconButton icon={<Trash2 size={16} />} label="Delete item" variant="danger" />
            </div>
          </div>
        </GlassCard>

        {/* 2. Inputs & Selects */}
        <GlassCard>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>
            2. Form Controls (Input & Select)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Input
              label="Dataset Name"
              placeholder="e.g. Sales Q3"
              hint="Unique identifier for your project"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              icon={<Database size={15} />}
            />

            <Input
              label="Error State Example"
              defaultValue="Invalid input value"
              error="A dataset with this name already exists"
            />

            <Select
              label="Chart Type"
              options={[
                { value: 'option-1', label: 'Bar Chart (Categorical)' },
                { value: 'option-2', label: 'Line Chart (Time Series)' },
                { value: 'option-3', label: 'Scatter Plot (Correlation)' },
              ]}
              value={selectValue}
              onChange={e => setSelectValue(e.target.value)}
              icon={<BarChart2 size={15} />}
            />
          </div>
        </GlassCard>

        {/* 3. Toggles, Segments & Tabs */}
        <GlassCard>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>
            3. Navigation & Toggles
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Switch
              label="AI Query Assistant"
              description="Enable real-time natural language query hints"
              checked={switchChecked}
              onChange={setSwitchChecked}
            />

            <div>
              <span className="ui-label" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                View Mode
              </span>
              <SegmentedControl
                options={[
                  { value: 'table', label: 'Table' },
                  { value: 'chart', label: 'Chart' },
                  { value: 'split', label: 'Split' },
                ]}
                value={segmentValue}
                onChange={setSegmentValue}
              />
            </div>

            <div>
              <Tabs
                tabs={[
                  { id: 'tab-1', label: 'Overview', badge: 12 },
                  { id: 'tab-2', label: 'Columns', badge: 8 },
                  { id: 'tab-3', label: 'Metadata' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
              <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--text-xs)', color: 'var(--ink-muted)' }}>
                Active tab: {activeTab}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* 4. Badges & Tooltips */}
        <GlassCard>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>
            4. Badges & Tooltips
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <Badge variant="default">Default</Badge>
              <Badge variant="success" dot>Active</Badge>
              <Badge variant="warning" dot>Processing</Badge>
              <Badge variant="danger" dot>Failed</Badge>
              <Badge variant="accent">AI Powered</Badge>
              <Badge variant="outline">v2.4.0</Badge>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center', paddingTop: 'var(--space-2)' }}>
              <Tooltip content="Tooltip placed on top" placement="top">
                <Button variant="secondary" size="sm">Hover Top</Button>
              </Tooltip>
              <Tooltip content="Tooltip placed on bottom" placement="bottom">
                <Button variant="secondary" size="sm">Hover Bottom</Button>
              </Tooltip>
              <Tooltip content="Data insights automatically computed" placement="right">
                <Badge variant="accent" dot>Hover Badge</Badge>
              </Tooltip>
            </div>
          </div>
        </GlassCard>

        {/* 5. Modals, Drawers & Dialogs */}
        <GlassCard>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>
            5. Overlays (Modal, Drawer, Dialog, Toast)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Open Modal
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open Drawer
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Confirm Dialog
            </Button>
          </div>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setToastType('info')
                setToastMessage('Report generated successfully')
              }}
            >
              Info Toast
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setToastType('success')
                setToastMessage('Dataset uploaded and indexed')
              }}
            >
              Success Toast
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setToastType('error')
                setToastMessage('Failed to execute query syntax')
              }}
            >
              Error Toast
            </Button>
          </div>
        </GlassCard>

        {/* 6. Skeletons & EmptyState */}
        <GlassCard>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', color: 'var(--ink)' }}>
            6. Loading Skeletons & EmptyState
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Skeleton variant="circle" width={38} height={38} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="text" width="40%" height={10} />
              </div>
            </div>
            <Skeleton variant="rect" width="100%" height={60} />
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <EmptyState
              icon={<FolderOpen size={24} />}
              title="No reports created"
              description="Save your visual analytics to export PDF and live summaries."
              action={
                <Button size="sm" variant="primary" icon={<ExternalLink size={14} />}>
                  Explore Templates
                </Button>
              }
            />
          </div>
        </GlassCard>
      </div>

      {/* Interactive Overlays */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Interactive Modal Component"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Save changes
            </Button>
          </div>
        }
      >
        <p style={{ margin: '0 0 var(--space-3)', color: 'var(--ink-muted)' }}>
          This modal provides backdrop blur, escape key closing, accessible focus, and theme-adaptive glass styling.
        </p>
        <Input label="Name" placeholder="Enter configuration name" />
      </Modal>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Inspection Drawer"
        side="right"
      >
        <p style={{ color: 'var(--ink-muted)' }}>
          Drawer slide-out overlay for side panels, inspector views, and detailed logs.
        </p>
        <Skeleton variant="rect" height={100} width="100%" />
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Dataset?"
        description="Are you sure you want to delete this dataset? This action cannot be undone."
        danger
        onConfirm={() => {
          setConfirmOpen(false)
          setToastType('error')
          setToastMessage('Item removed')
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {toastMessage && (
        <div style={{ position: 'fixed', bottom: 'var(--space-5)', right: 'var(--space-5)', zIndex: 'var(--z-toast)' }}>
          <Toast
            message={toastMessage}
            type={toastType}
            onDismiss={() => setToastMessage(null)}
          />
        </div>
      )}
    </div>
  )
}
