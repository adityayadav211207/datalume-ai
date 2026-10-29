import { useEffect, useState } from 'react'
import { Check, FileSpreadsheet, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import type { ReportPreferences } from '../lib/types'

export function SettingsPage({
  email,
  userName,
  preferences,
  onChange,
  onUpdateProfile,
  onSignOut,
}: {
  email: string
  userName: string
  preferences: ReportPreferences
  onChange: (preferences: ReportPreferences) => void
  onUpdateProfile: (name: string, email: string) => void
  onSignOut: () => void
}) {
  const [nameInput, setNameInput] = useState(userName)
  const [emailInput, setEmailInput] = useState(email)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNameInput(userName)
    setEmailInput(email)
  }, [userName, email])

  const handleSaveProfile = (event: React.FormEvent) => {
    event.preventDefault()
    onUpdateProfile(nameInput, emailInput)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const update = (patch: Partial<ReportPreferences>) => onChange({ ...preferences, ...patch })

  return (
    <div className="settings-view">
      <div className="eyebrow">
        <span className="eyebrow-dot" /> WORKSPACE SETTINGS
      </div>
      <h1>Settings</h1>
      <p>Manage your profile and set defaults used when generating and downloading reports.</p>
      <section className="settings-section">
        <div className="settings-title">
          <span className="settings-icon">
            <UserRound size={17} />
          </span>
          <div>
            <strong>Profile details</strong>
            <small>Edit your workspace personal information</small>
          </div>
        </div>
        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
          <label className="preference-field" style={{ borderBottom: 'none', padding: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Full name</span>
            <input
              type="text"
              value={nameInput}
              onChange={event => setNameInput(event.target.value)}
              placeholder="Your full name"
              required
              maxLength={60}
            />
          </label>
          <label className="preference-field" style={{ borderBottom: 'none', padding: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Email address</span>
            <input
              type="email"
              value={emailInput}
              onChange={event => setEmailInput(event.target.value)}
              placeholder="name@example.com"
              required
              maxLength={80}
            />
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '6px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span className="verified" style={{ fontSize: 'var(--text-xs)' }}>
              <ShieldCheck size={14} /> Personal workspace
            </span>
            <button
              type="submit"
              className="button-primary"
              style={{ padding: '8px 16px', fontSize: 'var(--text-xs)', gap: '6px' }}
            >
              <Check size={14} /> {saved ? 'Profile saved!' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
      <section className="settings-section">
        <div className="settings-title">
          <span className="settings-icon">
            <FileSpreadsheet size={17} />
          </span>
          <div>
            <strong>Report defaults</strong>
            <small>Saved in this browser and applied to future exports</small>
          </div>
        </div>
        <label className="preference-field">
          <span>Default report title</span>
          <input
            maxLength={80}
            value={preferences.title}
            onChange={event => update({ title: event.target.value })}
          />
        </label>
        <label className="preference-field">
          <span>Number format</span>
          <select
            value={preferences.numberFormat}
            onChange={event =>
              update({ numberFormat: event.target.value as ReportPreferences['numberFormat'] })
            }
          >
            <option value="standard">Standard (1,234.56)</option>
            <option value="compact">Compact (1.2K)</option>
          </select>
        </label>
        <div className="preference-toggle">
          <span>
            <strong>Executive summary</strong>
            <small>Include KPI cards</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.includeKpis}
            onChange={event => update({ includeKpis: event.target.checked })}
          />
        </div>
        <div className="preference-toggle">
          <span>
            <strong>Chart tables</strong>
            <small>Include chart values in the report</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.includeCharts}
            onChange={event => update({ includeCharts: event.target.checked })}
          />
        </div>
        <div className="preference-toggle">
          <span>
            <strong>Data preview</strong>
            <small>Include up to 25 rows</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.includePreview}
            onChange={event => update({ includePreview: event.target.checked })}
          />
        </div>
        <div className="preference-saved">
          <Check size={14} /> Changes save automatically on this device.
        </div>
      </section>
      <button className="signout-button" type="button" onClick={onSignOut}>
        <LogOut size={16} /> Close demo workspace
      </button>
    </div>
  )
}
