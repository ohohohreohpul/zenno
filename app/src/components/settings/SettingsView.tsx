'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { DEFAULT_GUARDRAILS, GuardrailsSection, type Guardrails } from './GuardrailsSection'
import { WhatsAppConnectCard } from './WhatsAppConnectCard'
import { CredentialChannelCard, type ChannelCardConfig } from './CredentialChannelCard'
import { WebchatCard } from './WebchatCard'
import { OptimizeCard } from './OptimizeCard'

const TELEGRAM_CONFIG: ChannelCardConfig = {
  id: 'telegram',
  name: 'Telegram',
  color: 'var(--channel-telegram)',
  description: 'Create a bot with @BotFather and paste the token — connected in seconds',
  endpoint: '/api/channels/telegram',
  fields: [
    { key: 'bot_token', label: 'Bot token', placeholder: '123456789:AAF...', type: 'password' },
  ],
  helpText: 'In Telegram: message @BotFather → /newbot → copy the token.',
  docsUrl: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
}

const LINE_CONFIG: ChannelCardConfig = {
  id: 'line',
  name: 'LINE',
  color: 'var(--channel-line)',
  description: 'Messaging API channel — paste the secret and access token from the LINE Developers console',
  endpoint: '/api/channels/line',
  fields: [
    { key: 'channel_secret', label: 'Channel secret', placeholder: 'xxxx', type: 'password' },
    { key: 'channel_access_token', label: 'Channel access token', placeholder: 'xxxx', type: 'password' },
  ],
  helpText: 'After connecting, set the webhook URL shown here in the LINE console.',
  docsUrl: 'https://developers.line.biz/en/docs/messaging-api/',
}

const MESSENGER_CONFIG: ChannelCardConfig = {
  id: 'messenger',
  name: 'Facebook Messenger',
  color: 'var(--channel-messenger)',
  description: 'Paste a Page access token from your Meta app — inbound events route by page automatically',
  endpoint: '/api/channels/messenger',
  fields: [
    { key: 'page_access_token', label: 'Page access token', placeholder: 'EAAxxxx', type: 'password' },
  ],
  helpText: 'After connecting, add the webhook URL + verify token shown here in the Meta app dashboard (messages subscription).',
  docsUrl: 'https://developers.facebook.com/docs/messenger-platform/webhooks',
}

const INSTAGRAM_CONFIG: ChannelCardConfig = {
  id: 'instagram',
  name: 'Instagram DM',
  color: 'var(--channel-instagram)',
  description: 'Connect an Instagram Professional account through your Meta app',
  endpoint: '/api/channels/instagram',
  fields: [
    { key: 'page_access_token', label: 'Page access token', placeholder: 'EAAxxxx', type: 'password' },
    { key: 'app_secret', label: 'Meta app secret', placeholder: '••••••••', type: 'password' },
  ],
  helpText: 'After connecting, add the webhook URL and verify token shown here to the Instagram webhook in Meta Developers.',
  docsUrl: 'https://developers.facebook.com/docs/messenger-platform/instagram/',
}

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'channels' | 'ai' | 'workspace'>('ai')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [guardrails, setGuardrails] = useState<Guardrails>(DEFAULT_GUARDRAILS)
  const [workspace, setWorkspace] = useState({ name: '', slug: '' })
  const [workspaceSaved, setWorkspaceSaved] = useState(false)

  useEffect(() => {
    fetch('/api/ai-config?workspaceId=ws-1')
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.systemPrompt) setSystemPrompt(d.data.systemPrompt)
        if (d.data?.guardrails) setGuardrails(d.data.guardrails)
      })
      .catch(() => {})
    fetch('/api/workspaces/ws-1')
      .then((r) => r.json())
      .then((body) => setWorkspace({ name: body.data?.name ?? '', slug: body.data?.slug ?? '' }))
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

  async function handleSaveWorkspace() {
    setSaveError(null)
    const res = await fetch('/api/workspaces/ws-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workspace),
    })
    const body = await res.json()
    if (!res.ok) { setSaveError(typeof body.error === 'string' ? body.error : 'Could not save workspace'); return }
    setWorkspace({ name: body.data.name, slug: body.data.slug })
    setWorkspaceSaved(true)
    setTimeout(() => setWorkspaceSaved(false), 2000)
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

            <OptimizeCard />

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
            <WhatsAppConnectCard />
            <WebchatCard />
            <CredentialChannelCard config={TELEGRAM_CONFIG} />
            <CredentialChannelCard config={LINE_CONFIG} />
            <CredentialChannelCard config={MESSENGER_CONFIG} />
            <CredentialChannelCard config={INSTAGRAM_CONFIG} />
          </div>
        )}

        {activeTab === 'workspace' && (
          <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <WorkspaceField label="Workspace name" value={workspace.name} onChange={(name) => setWorkspace((current) => ({ ...current, name }))} />
            <WorkspaceField label="Slug" value={workspace.slug} onChange={(slug) => setWorkspace((current) => ({ ...current, slug }))} hint="Used in webhook URLs" />
            {saveError && <div style={{ fontSize: 12, color: 'var(--stage-vip)' }}>{saveError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveWorkspace} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-sm)', background: workspaceSaved ? 'var(--stage-attended)' : 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {workspaceSaved ? <><Check size={13} /> Saved</> : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WorkspaceField({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--card)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
