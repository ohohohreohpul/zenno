'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

export interface WidgetSettings {
  accentColor: string
  title: string
  subtitle: string
  greeting: string
  position: 'right' | 'left'
}

interface WebchatStyleEditorProps {
  endpoint: string
  initial: WidgetSettings
  onSaved: (settings: WidgetSettings) => void
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/

export function WebchatStyleEditor({ endpoint, initial, onSaved }: WebchatStyleEditorProps) {
  const [draft, setDraft] = useState<WidgetSettings>(initial)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof WidgetSettings>(key: K, value: WidgetSettings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function save() {
    if (!HEX_PATTERN.test(draft.accentColor)) {
      setError('Accent color must be a hex value like #7C3AED')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const payload = await res.json()
      if (!res.ok || !payload.data?.widget) throw new Error(payload.error ?? 'Could not save')
      setDraft(payload.data.widget)
      setSaved(true)
      onSaved(payload.data.widget)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const previewColor = HEX_PATTERN.test(draft.accentColor) ? draft.accentColor : '#18181B'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 16, alignItems: 'start' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Accent color">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={previewColor}
              onChange={(e) => update('accentColor', e.target.value)}
              style={{ width: 34, height: 30, padding: 0, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
              aria-label="Pick accent color"
            />
            <input
              value={draft.accentColor}
              onChange={(e) => update('accentColor', e.target.value)}
              maxLength={7}
              style={inputStyle}
              placeholder="#18181B"
            />
          </div>
        </Field>
        <Field label="Header title">
          <input value={draft.title} onChange={(e) => update('title', e.target.value)} maxLength={40} style={inputStyle} />
        </Field>
        <Field label="Header subtitle">
          <input value={draft.subtitle} onChange={(e) => update('subtitle', e.target.value)} maxLength={60} style={inputStyle} />
        </Field>
        <Field label="Greeting message" hint="Shown to new visitors when they open the chat. Leave empty for none.">
          <textarea
            value={draft.greeting}
            onChange={(e) => update('greeting', e.target.value)}
            maxLength={200}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </Field>
        <Field label="Position">
          <div style={{ display: 'flex', gap: 6 }}>
            {(['right', 'left'] as const).map((side) => (
              <button
                key={side}
                onClick={() => update('position', side)}
                style={{
                  padding: '6px 14px',
                  border: draft.position === side ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: draft.position === side ? 'var(--accent-subtle)' : 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: draft.position === side ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {side}
              </button>
            ))}
          </div>
        </Field>
        {error && <div style={{ fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>}
        <div>
          <button
            onClick={save}
            disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-sm)', background: saved ? 'var(--stage-attended)' : 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {busy ? <Loader2 size={13} className="spin" /> : saved ? <Check size={13} /> : null}
            {saved ? 'Saved — live on your site' : 'Save styling'}
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)', padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 10 }}>LIVE PREVIEW</div>
        <div style={{ display: 'flex', justifyContent: draft.position === 'left' ? 'flex-start' : 'flex-end' }}>
          <div style={{ width: 260, borderRadius: 12, overflow: 'hidden', background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
            <div style={{ background: previewColor, color: 'white', padding: '11px 13px', fontSize: 13, fontWeight: 600 }}>
              {draft.title || 'Chat with us'}
              {draft.subtitle && <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 400, marginTop: 2 }}>{draft.subtitle}</div>}
            </div>
            <div style={{ minHeight: 90, padding: 12, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {draft.greeting && (
                <div style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid #e4e4e7', borderRadius: '10px 10px 10px 4px', padding: '8px 10px', fontSize: 12, color: '#18181b', maxWidth: '85%' }}>
                  {draft.greeting}
                </div>
              )}
              <div style={{ alignSelf: 'flex-end', background: previewColor, color: 'white', borderRadius: '10px 10px 4px 10px', padding: '8px 10px', fontSize: 12, maxWidth: '85%' }}>
                Do you have time on Friday?
              </div>
            </div>
            <div style={{ borderTop: '1px solid #e4e4e7', padding: '10px 12px', color: '#a1a1aa', fontSize: 12, background: 'white' }}>
              Type a message… <span style={{ float: 'right', color: previewColor, fontWeight: 600 }}>Send</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: draft.position === 'left' ? 'flex-start' : 'flex-end', marginTop: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: previewColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 11px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--card)',
  fontSize: 13,
  color: 'var(--text-primary)',
  outline: 'none',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
