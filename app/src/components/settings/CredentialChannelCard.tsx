'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, Loader2, Unplug } from 'lucide-react'

/**
 * Generic connect card for channels where the business pastes credentials
 * (Telegram bot token, LINE channel keys, Messenger page token). The
 * channel config drives the form; the API routes share a response shape:
 * { data: { status, ...display fields } } or { error }.
 */

export interface ChannelFieldConfig {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'password'
}

export interface ChannelCardConfig {
  id: string
  name: string
  color: string
  description: string
  endpoint: string
  fields: ChannelFieldConfig[]
  helpText?: string
  docsUrl?: string
  guideUrl?: string
  /** Set for Meta channels — enables the one-click Connect with Facebook flow. */
  meta?: 'messenger' | 'instagram'
}

interface ChannelState {
  status: 'connected' | 'disconnected'
  [key: string]: unknown
}

interface MetaPickerPage {
  id: string
  name: string
  instagram_username: string | null
  instagram_linked: boolean
}

const WORKSPACE_ID = 'ws-1'

export function CredentialChannelCard({ config }: { config: ChannelCardConfig }) {
  const [state, setState] = useState<ChannelState | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !config.meta) return null
    const params = new URLSearchParams(window.location.search)
    const metaError = params.get('meta_error')
    if (!metaError || (params.get('meta_pick') ?? config.meta) !== config.meta) return null
    return metaError
  })
  const [oauthConfigured, setOauthConfigured] = useState(false)
  const [metaPages, setMetaPages] = useState<MetaPickerPage[]>([])
  const [metaNotice, setMetaNotice] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !config.meta) return null
    const params = new URLSearchParams(window.location.search)
    if (params.get('meta_connected') !== config.meta) return null
    const page = params.get('meta_page')
    return `Connected${page ? ` as ${page}` : ''} via Facebook ✓`
  })

  useEffect(() => {
    fetch(`${config.endpoint}?workspaceId=${WORKSPACE_ID}`)
      .then((r) => r.json())
      .then((b) => setState(b.data ?? { status: 'disconnected' }))
      .catch(() => setState({ status: 'disconnected' }))
  }, [config.endpoint])

  useEffect(() => {
    if (!config.meta) return
    fetch(`/api/channels/meta/pages?channel=${config.meta}`)
      .then((r) => r.json())
      .then((b) => {
        setOauthConfigured(Boolean(b.data?.oauth_configured))
        setMetaPages(Array.isArray(b.data?.pages) ? b.data.pages : [])
      })
      .catch(() => setOauthConfigured(false))
  }, [config.meta])

  async function handlePickPage(pageId: string) {
    if (!config.meta) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/channels/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: config.meta, page_id: pageId }),
      })
      const body = await res.json()
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Could not connect the Page')
      setState({ status: 'connected', page_name: body.data.page_name })
      setMetaPages([])
      setMetaNotice(`Connected as ${body.data.page_name} via Facebook ✓`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not connect the Page')
    } finally {
      setBusy(false)
    }
  }

  async function handleConnect() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${config.endpoint}?workspaceId=${WORKSPACE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const body = await res.json()
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Connect failed')
      setState(body.data)
      setValues({})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connect failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(`Disconnect ${config.name}?`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${config.endpoint}?workspaceId=${WORKSPACE_ID}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Disconnect failed')
      setState(body.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  const connected = state?.status === 'connected'
  const displayName =
    (state?.bot_username as string) || (state?.bot_name as string) || (state?.page_name as string) || null

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: config.color }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{config.name}</span>
          <span style={{ fontSize: 10, background: connected ? 'var(--stage-attended)' : 'var(--text-tertiary)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
            {state === null ? '…' : connected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {connected && (
          <button onClick={handleDisconnect} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
            <Unplug size={12} /> Disconnect
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
        {config.description}
        {config.docsUrl && (
          <> · <a href={config.docsUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>docs</a></>
        )}
        {config.guideUrl && (
          <> · <Link href={config.guideUrl} style={{ color: 'var(--accent)', fontWeight: 600 }}>step-by-step setup guide</Link></>
        )}
      </div>

      {metaNotice && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--stage-attended)', color: 'white', fontSize: 12, fontWeight: 500 }}>
          {metaNotice}
        </div>
      )}

      {connected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <Check size={14} style={{ color: 'var(--stage-attended)' }} />
            <span>Connected{displayName ? <> as <b>{displayName}</b></> : null}</span>
          </div>
          {typeof state?.webhook_url === 'string' && state.webhook_url && (
            <CopyRow label="Webhook URL (set this on the platform)" value={state.webhook_url} />
          )}
          {typeof state?.verify_token === 'string' && state.verify_token && (
            <CopyRow label="Verify token" value={state.verify_token} />
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {config.meta && oauthConfigured && metaPages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Pick the Page to connect:</div>
              {metaPages.map((page) => {
                const igMissing = config.meta === 'instagram' && !page.instagram_linked
                return (
                  <div key={page.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: 13 }}>
                      <b>{page.name}</b>
                      {page.instagram_username && <span style={{ color: 'var(--text-tertiary)' }}> · @{page.instagram_username}</span>}
                      {igMissing && <span style={{ color: 'var(--text-tertiary)' }}> · no Instagram linked</span>}
                    </div>
                    <button
                      onClick={() => handlePickPage(page.id)}
                      disabled={busy || igMissing}
                      style={{ padding: '6px 14px', border: 'none', borderRadius: 'var(--radius-sm)', background: igMissing ? 'var(--text-tertiary)' : 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 500, cursor: igMissing ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}
                    >
                      Connect
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {config.meta && oauthConfigured && metaPages.length === 0 && (
            <div>
              <a
                href={`/api/channels/meta/oauth/start?channel=${config.meta}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: '#1877F2', color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                Connect with Facebook
              </a>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                One click — pick your Page in the Facebook popup and you&apos;re live. No tokens to paste.
              </div>
            </div>
          )}

          {config.meta && oauthConfigured ? (
            <details>
              <summary style={{ fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer' }}>Connect manually instead (advanced)</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <ManualFields config={config} values={values} setValues={setValues} busy={busy} onConnect={handleConnect} />
              </div>
            </details>
          ) : (
            <ManualFields config={config} values={values} setValues={setValues} busy={busy} onConnect={handleConnect} />
          )}
        </div>
      )}

      {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>}
    </div>
  )
}

interface ManualFieldsProps {
  config: ChannelCardConfig
  values: Record<string, string>
  setValues: (values: Record<string, string>) => void
  busy: boolean
  onConnect: () => void
}

function ManualFields({ config, values, setValues, busy, onConnect }: ManualFieldsProps) {
  return (
    <>
      {config.fields.map((f) => (
        <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
          {f.label}
          <input
            type={f.type}
            placeholder={f.placeholder}
            value={values[f.key] ?? ''}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            style={{ padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--card)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
          />
        </label>
      ))}
      {config.helpText && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{config.helpText}</div>
      )}
      <div>
        <button
          onClick={onConnect}
          disabled={busy || config.fields.some((f) => !(values[f.key] ?? '').trim())}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}
        >
          {busy && <Loader2 size={13} className="spin" />} Connect
        </button>
      </div>
    </>
  )
}

export function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
      {label}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <code style={{ flex: 1, padding: '7px 10px', background: 'var(--sidebar)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {value}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--card)', color: copied ? 'var(--stage-attended)' : 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  )
}
