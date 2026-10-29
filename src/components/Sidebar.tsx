import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  MessageCircle,
  Plus,
  Settings,
  Sparkles,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react'
import type { Conversation, Dataset } from '../lib/types'

export interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  activePage: string
  setActivePage: (page: string) => void
  setChatOpen: (open: boolean) => void
  userName: string
  userEmail: string
  datasets: Dataset[]
  dataset: Dataset | null
  selectDataset: (item: Dataset) => void
  search: string
  conversations: Conversation[]
  conversationId: string | null
  reopenConversation: (conv: Conversation) => void
  renameConversation: (conv: Conversation) => void
  removeConversation: (conv: Conversation) => void
  setUtilityPanel: (panel: 'help' | 'notifications' | null) => void
  collapsed?: boolean
  setCollapsed?: (collapsed: boolean) => void
}

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activePage,
  setActivePage,
  setChatOpen,
  userName,
  userEmail,
  datasets,
  dataset,
  selectDataset,
  search,
  conversations,
  conversationId,
  reopenConversation,
  renameConversation,
  removeConversation,
  setUtilityPanel,
  collapsed: externalCollapsed,
  setCollapsed: externalSetCollapsed,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const setIsCollapsed = externalSetCollapsed || setInternalCollapsed

  const navigation = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Upload Dataset', icon: UploadCloud },
    { label: 'Data Explorer', icon: Database },
    { label: 'Visualizations', icon: BarChart3 },
    { label: 'AI Data Assistant', icon: Bot },
    { label: 'Saved Reports', icon: FileSpreadsheet },
    { label: 'Settings', icon: Settings },
  ]

  return (
    <aside
      className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${
        isCollapsed ? 'sidebar-collapsed' : ''
      }`}
      aria-label="Main navigation"
    >
      {/* Brand Header */}
      <div className="sidebar-header">
        <a
          className="brand"
          href="#overview"
          onClick={e => {
            e.preventDefault()
            setActivePage('Overview')
          }}
          title="DataLume AI"
        >
          <span className="brand-mark">
            <Activity size={20} />
          </span>
          {!isCollapsed && (
            <span>
              data<span className="brand-light">lume</span>
              <small>AI ANALYTICS</small>
            </span>
          )}
        </a>

        <button
          type="button"
          className="sidebar-collapse-btn desktop-only"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Workspace Switcher */}
      <button
        className="workspace-switch"
        type="button"
        title={`Workspace: ${userName}'s Personal Workspace`}
      >
        <span className="workspace-dot">{userName[0]?.toUpperCase()}</span>
        {!isCollapsed && (
          <>
            <span>
              <strong>Personal workspace</strong>
              <small>Free plan</small>
            </span>
            <ChevronDown size={15} />
          </>
        )}
      </button>

      {/* Main Navigation */}
      {!isCollapsed && <div className="nav-caption">WORKSPACE</div>}
      <nav className="primary-nav">
        {navigation.map(({ label, icon: Icon }) => {
          const isActive = activePage === label
          return (
            <button
              key={label}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? label : undefined}
              onClick={() => {
                setActivePage(label)
                if (label === 'AI Data Assistant') setChatOpen(true)
                setSidebarOpen(false)
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-pill"
                  className="nav-active-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={18} strokeWidth={1.8} className="nav-icon" />
              {!isCollapsed && <span>{label}</span>}
              {!isCollapsed && label === 'AI Data Assistant' && <span className="nav-live" />}
            </button>
          )
        })}
      </nav>

      {/* Datasets section */}
      {!isCollapsed && (
        <div className="sidebar-datasets">
          <div className="nav-caption">
            RECENT DATASETS{' '}
            <button
              type="button"
              title="Upload dataset"
              onClick={() => setActivePage('Upload Dataset')}
            >
              <Plus size={15} />
            </button>
          </div>
          {datasets
            .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 4)
            .map(item => (
              <button
                type="button"
                className={`dataset-nav ${dataset?.id === item.id ? 'selected' : ''}`}
                key={item.id}
                onClick={() => selectDataset(item)}
              >
                <span className="file-dot">
                  <FileSpreadsheet size={14} />
                </span>
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          {!datasets.length && <p className="sidebar-empty">Your datasets will appear here</p>}
        </div>
      )}

      {/* Lumi Chat History section */}
      {!isCollapsed && (
        <div className="sidebar-conversations">
          <div className="nav-caption">LUMI HISTORY</div>
          {conversations.slice(0, 4).map(conversation => (
            <div className="conversation-nav-row" key={conversation.id}>
              <button
                type="button"
                className={`conversation-nav ${
                  conversationId === conversation.id ? 'selected' : ''
                }`}
                onClick={() => reopenConversation(conversation)}
              >
                <MessageCircle size={13} />
                <span className="truncate">{conversation.title}</span>
              </button>
              <div className="conversation-actions">
                <button
                  type="button"
                  title="Rename conversation"
                  onClick={() => renameConversation(conversation)}
                >
                  ···
                </button>
                <button
                  type="button"
                  title="Delete conversation"
                  onClick={() => removeConversation(conversation)}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Footer Section */}
      <div className="sidebar-bottom">
        {!isCollapsed && (
          <button
            className="support-chip"
            type="button"
            onClick={() => setUtilityPanel('help')}
          >
            <span className="support-icon">
              <Sparkles size={16} />
            </span>
            <span>
              <strong>Need a hand?</strong>
              <small>Explore our quick guide</small>
            </span>
            <ChevronRight size={14} />
          </button>
        )}
        <button
          className="user-profile"
          type="button"
          title="Edit profile in Settings"
          onClick={() => setActivePage('Settings')}
        >
          <span className="avatar">
            <UserRound size={17} />
          </span>
          {!isCollapsed && (
            <>
              <span>
                <strong>{userName}</strong>
                <small>{userEmail}</small>
              </span>
              <Settings size={15} />
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
