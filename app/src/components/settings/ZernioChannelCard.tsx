'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Unplug } from 'lucide-react'

type Channel = 'messenger' | 'instagram'

interface ChannelState {
  configured: boolean
  status: 'connected' | 'disconnected'
  account_name: string | null
}

const WORKSPACE_ID = 'ws-1'

export function ZernioChannelCard({
  channel,
  name,
  description,
  color,
}: {
  channel: Channel
  name: string
  description: string
  color: string
}) {
  const [state, setState] = useState<ChannelState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('zernio_channel') === channel ? params.get('zernio_error') : null
  })
  const [notice] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    if (params.get('zernio_connected') !== channel) return null
    const account = params.get('zernio_account')
    return `Connected${account ? ` as ${account}` : ''} ✓`
  })

  useEffect(() => {
    fetch(`/api/channels/zernio?channel=${channel}&workspaceId=${WORKSPACE_ID}`)
      .then((response) => response.json())
      .then((body) => setState(body.data ?? { configured: false, status: 'disconnected', account_name: null }))
      .catch(() => setState({ configured: false, status: 'disconnected', account_name: null }))
  }, [channel])

  async function disconnect() {
    if (!window.confirm(`Disconnect ${name}?`)) return
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/channels/zernio?channel=${channel}&workspaceId=${WORKSPACE_ID}`, { method: 'DELETE' })
      const body = await response.json()
      if (!response.ok || !body.data) throw new Error(body.error ?? 'Disconnect failed')
      setState(body.data)
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  const connected = state?.status === 'connected'
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: color }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 10, background: connected ? 'var(--stage-attended)' : 'var(--text-tertiary)', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
            {state === null ? '…' : connected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {connected && (
          <button onClick={disconnect} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
            {busy ? <Loader2 size={12} className="spin" /> : <Unplug size={12} />} Disconnect
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>{description}</div>

      {notice && <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--stage-attended)', color: 'white', fontSize: 12, fontWeight: 500 }}>{notice}</div>}

      {connected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <Check size={14} style={{ color: 'var(--stage-attended)' }} />
          <span>Connected{state?.account_name ? <> as <b>{state.account_name}</b></> : null}</span>
        </div>
      ) : state?.configured ? (
        <div>
          <a href={`/api/channels/zernio/oauth/start?channel=${channel}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: channel === 'messenger' ? '#1877F2' : '#E1306C', color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Connect {channel === 'messenger' ? 'Facebook Page' : 'Instagram'}
          </a>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>Secure sign-in. Choose the account, approve access, and the AI receptionist can begin replying.</div>
        </div>
      ) : state !== null ? (
        <div style={{ fontSize: 12, color: 'var(--stage-vip)' }}>Social connections are temporarily unavailable. Please contact support.</div>
      ) : null}

      {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>}
    </div>
  )
}
