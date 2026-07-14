'use client'

import { useEffect, useState } from 'react'
import { Check, Globe, Loader2, RefreshCw } from 'lucide-react'
import { CopyRow } from './CredentialChannelCard'

/**
 * Web chat channel: one click mints an embed key and the script snippet to
 * paste into any website. No external platform involved.
 */

interface WebchatState {
  status: 'connected' | 'disconnected'
  embed_key: string | null
  snippet: string | null
}

const WORKSPACE_ID = 'ws-1'
const ENDPOINT = '/api/channels/webchat'

export function WebchatCard() {
  const [state, setState] = useState<WebchatState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${ENDPOINT}?workspaceId=${WORKSPACE_ID}`)
      .then((r) => r.json())
      .then((b) => setState(b.data ?? { status: 'disconnected', embed_key: null, snippet: null }))
      .catch(() => setState({ status: 'disconnected', embed_key: null, snippet: null }))
  }, [])

  async function call(method: 'POST' | 'DELETE', body?: object) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${ENDPOINT}?workspaceId=${WORKSPACE_ID}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const payload = await res.json()
      if (!res.ok || !payload.data) throw new Error(payload.error ?? 'Request failed')
      setState(payload.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const connected = state?.status === 'connected'

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--channel-webchat)' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Web Chat</span>
          <span style={{ fontSize: 10, background: connected ? 'var(--stage-attended)' : 'var(--text-tertiary)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
            {state === null ? '…' : connected ? 'Live' : 'Off'}
          </span>
        </div>
        {connected && (
          <button onClick={() => call('DELETE')} disabled={busy} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
            Turn off
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
        A chat bubble for any website — paste one script tag and the AI answers visitors there too.
      </div>

      {!connected && (
        <button
          onClick={() => call('POST')}
          disabled={busy || state === null}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          {busy ? <Loader2 size={13} className="spin" /> : <Globe size={13} />} Enable web chat
        </button>
      )}

      {connected && state?.snippet && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <Check size={14} style={{ color: 'var(--stage-attended)' }} />
            <span>Widget is live — paste this into any website:</span>
          </div>
          <CopyRow label="Embed snippet" value={state.snippet} />
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)', padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 10 }}>WEBSITE PREVIEW</div>
            <div style={{ width: 280, maxWidth: '100%', marginLeft: 'auto', borderRadius: 12, overflow: 'hidden', background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
              <div style={{ background: 'var(--accent)', color: 'white', padding: '11px 13px', fontSize: 13, fontWeight: 600 }}>Chat with us<div style={{ fontSize: 10, opacity: .7, fontWeight: 400, marginTop: 2 }}>Typically replies in seconds</div></div>
              <div style={{ minHeight: 90, padding: 12, background: '#fafafa' }}>
                <div style={{ display: 'inline-block', background: 'white', border: '1px solid #e4e4e7', borderRadius: '10px 10px 10px 4px', padding: '8px 10px', fontSize: 12 }}>Hi! How can I help you today?</div>
              </div>
              <div style={{ borderTop: '1px solid #e4e4e7', padding: '10px 12px', color: '#a1a1aa', fontSize: 12 }}>Type a message… <span style={{ float: 'right', color: 'var(--accent)', fontWeight: 600 }}>Send</span></div>
            </div>
          </div>
          <div>
            <button
              onClick={() => {
                if (window.confirm('Rotate the key? The old snippet stops working everywhere.')) {
                  call('POST', { rotate: true })
                }
              }}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
            >
              <RefreshCw size={11} /> Rotate key
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>}
    </div>
  )
}
