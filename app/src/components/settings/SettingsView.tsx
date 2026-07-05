'use client'

import { useEffect, useState } from 'react'
import { Check, AlertCircle, ExternalLink } from 'lucide-react'
import { DEFAULT_GUARDRAILS, GuardrailsSection, type Guardrails } from './GuardrailsSection'

const CHANNELS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Official 360dialog Business API',
    color: 'var(--channel-whatsapp)',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'D3l7a_xxxx', type: 'password' },
      { key: 'phone_number', label: 'Phone Number', placeholder: '+66812345678', type: 'text' },
    ],
    docsUrl: 'https://docs.360dialog.com/',
    connected: true,
  },
  {
    id: 'instagram',
    name: 'Instagram DM',
    description: 'Meta Cloud API · requires Business account',
    color: 'var(--channel-instagram)',
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', placeholder: 'EAAxxxx', type: 'password' },
      { key: 'page_id', label: 'Page ID', placeholder: '123456789', type: 'text' },
    ],
    docsUrl: 'https://developers.facebook.com/docs/messenger-platform/',
    connected: false,
  },
  {
    id: 'line',
    name: 'LINE',
    description: 'LINE Messaging API',
    color: 'var(--channel-line)',
    fields: [
      { key: 'channel_secret', label: 'Channel Secret', placeholder: 'xxxx', type: 'password' },
      { key: 'channel_access_token', label: 'Channel Access Token', placeholder: 'xxxx', type: 'password' },
    ],
    docsUrl: 'https://developers.line.biz/en/docs/messaging-api/',
    connected: false,
  },
]

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'channels' | 'ai' | 'workspace'>('ai')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [guardrails, setGuardrails] = useState<Guardrails>(DEFAULT_GUARDRAILS)

  useEffect(() => {
    fetch('/api/ai-config?workspaceId=ws-1')
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.systemPrompt) setSystemPrompt(d.data.systemPrompt)
        if (d.data?.guardrails) setGuardrails(d.data.guardrails)
      })
      .catch(() => {})
  }, [])

  async function handleSavePrompt() {
    setSaveError(null)
    try {
      const res = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'ws-1', systemPrompt }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError('Could not save the prompt. Please try again.')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Settings</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        {(['ai', 'channels', 'workspace'] as const).map((tab) => {
          const LABELS = { ai: 'AI Agent', channels: 'Channels', workspace: 'Workspace' }
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 16px',
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {LABELS[tab]}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {activeTab === 'ai' && (
          <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>System Prompt</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                This is the personality and knowledge base for your AI agent. Be specific about your business, services, and tone.
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--card)',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
                {saveError && <span style={{ fontSize: 12, color: 'var(--stage-vip)' }}>{saveError}</span>}
                <button
                  onClick={handleSavePrompt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: saved ? 'var(--stage-attended)' : 'var(--accent)',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background var(--duration-fast)',
                  }}
                >
                  {saved ? <><Check size={13} /> Saved</> : 'Save prompt'}
                </button>
              </div>
            </div>

            <GuardrailsSection guardrails={guardrails} onChange={setGuardrails} />

            <div style={{ background: 'var(--sidebar)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>AI Model</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>claude-sonnet-4-6</div>
                <span style={{ fontSize: 10, background: 'var(--stage-attended)', color: 'white', padding: '2px 7px', borderRadius: 99, fontWeight: 600 }}>Active</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Fast, intelligent replies optimised for sales conversations.</div>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CHANNELS.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
        )}

        {activeTab === 'workspace' && (
          <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Workspace name" defaultValue="Lotus Yoga Bangkok" />
            <Field label="Slug" defaultValue="lotus-yoga" hint="Used in webhook URLs" />
            <Field label="Custom domain" defaultValue="" placeholder="chat.lotusmyoga.com (optional)" />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <SaveButton />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChannelCard({ channel }: { channel: typeof CHANNELS[0] }) {
  const [open, setOpen] = useState(channel.connected)
  const [values, setValues] = useState<Record<string, string>>({})

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: channel.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{channel.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{channel.description}</div>
        </div>
        {channel.connected ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--stage-attended)', fontWeight: 500 }}>
            <Check size={12} /> Connected
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Not connected</span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 16 }} />
          {channel.fields.map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '9px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <a href={channel.docsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              <ExternalLink size={11} /> View docs
            </a>
            <button style={{ padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, defaultValue, placeholder, hint }: { label: string; defaultValue: string; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--card)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function SaveButton() {
  const [saved, setSaved] = useState(false)
  return (
    <button
      onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-sm)', background: saved ? 'var(--stage-attended)' : 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background var(--duration-fast)' }}
    >
      {saved ? <><Check size={13} /> Saved</> : 'Save changes'}
    </button>
  )
}
