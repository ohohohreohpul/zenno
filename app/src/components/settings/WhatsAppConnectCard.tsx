'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Loader2, QrCode, Smartphone, Unplug } from 'lucide-react'

/**
 * Connect the workspace's own WhatsApp number by scanning a QR with the
 * WhatsApp app (Linked Devices). Shows connection state, the live QR while
 * pairing, and the warm-up send limits once connected.
 */

interface Limits {
  dailyCapBase: number
  dailyCapMax: number
  minDelaySeconds: number
}

interface ChannelStatus {
  gateway_configured: boolean
  status: 'disconnected' | 'pending_qr' | 'connected'
  phone_number: string | null
  qr: string | null
  pairing_code: string | null
  limits: Limits
  cap_today: number | null
  sent_today: number
}

const POLL_INTERVAL_MS = 3000
const WORKSPACE_ID = 'ws-1'

export function WhatsAppConnectCard() {
  const [status, setStatus] = useState<ChannelStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitsDraft, setLimitsDraft] = useState<Limits | null>(null)
  const [limitsSaved, setLimitsSaved] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels/whatsapp?workspaceId=${WORKSPACE_ID}`)
      if (!res.ok) throw new Error(`Status check failed (${res.status})`)
      const body = (await res.json()) as { data: ChannelStatus }
      setStatus(body.data)
      setLimitsDraft((prev) => prev ?? body.data.limits)
    } catch {
      setError('Could not reach the server')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Poll while a QR pairing is pending so the card flips to connected by itself.
  useEffect(() => {
    if (status?.status === 'pending_qr') {
      pollRef.current = setInterval(refresh, POLL_INTERVAL_MS)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
    return undefined
  }, [status?.status, refresh])

  async function handleConnect() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/channels/whatsapp?workspaceId=${WORKSPACE_ID}`, { method: 'POST' })
      const body = (await res.json()) as { data?: ChannelStatus; error?: string }
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Connect failed')
      setStatus(body.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connect failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect this WhatsApp number? The bot will stop replying on WhatsApp.')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/channels/whatsapp?workspaceId=${WORKSPACE_ID}`, { method: 'DELETE' })
      const body = (await res.json()) as { data?: ChannelStatus; error?: string }
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Disconnect failed')
      setStatus(body.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveLimits() {
    if (!limitsDraft) return
    setError(null)
    try {
      const res = await fetch(`/api/channels/whatsapp?workspaceId=${WORKSPACE_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_cap_base: limitsDraft.dailyCapBase,
          daily_cap_max: limitsDraft.dailyCapMax,
          min_delay_seconds: limitsDraft.minDelaySeconds,
        }),
      })
      const body = (await res.json()) as { data?: ChannelStatus; error?: string }
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Save failed')
      setStatus(body.data)
      setLimitsSaved(true)
      setTimeout(() => setLimitsSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  const cardStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--card)',
    padding: 20,
  }

  if (!status) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)', fontSize: 13 }}>
          <Loader2 size={14} className="spin" /> Loading WhatsApp status…
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--channel-whatsapp)' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>WhatsApp</span>
          <StatusBadge status={status.status} />
        </div>
        {status.status === 'connected' && (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
            }}
          >
            <Unplug size={12} /> Disconnect
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        Connect your own number — scan a QR with the WhatsApp app, like WhatsApp Web.
      </div>

      {!status.gateway_configured && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--sidebar)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
          The session gateway is not configured yet. Set <code>WA_GATEWAY_URL</code> and{' '}
          <code>WA_GATEWAY_API_KEY</code> to enable connecting a number.
        </div>
      )}

      {status.gateway_configured && status.status === 'disconnected' && (
        <button
          onClick={handleConnect}
          disabled={busy}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)',
            color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {busy ? <Loader2 size={14} className="spin" /> : <QrCode size={14} />} Connect WhatsApp
        </button>
      )}

      {status.status === 'pending_qr' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 8, background: 'white' }}>
            {status.qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={status.qr} alt="WhatsApp pairing QR code" width={196} height={196} style={{ display: 'block' }} />
            ) : (
              <div style={{ width: 196, height: 196, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
                <Loader2 size={16} className="spin" />
              </div>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Smartphone size={14} /> Scan with your phone
            </div>
            1. Open WhatsApp on your phone<br />
            2. Tap <b>Settings → Linked devices</b><br />
            3. Tap <b>Link a device</b> and scan this code
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-tertiary)' }}>
              The code refreshes automatically. This page updates once you scan.
            </div>
          </div>
        </div>
      )}

      {status.status === 'connected' && limitsDraft && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
            <Check size={14} style={{ color: 'var(--stage-attended)' }} />
            <span>
              Connected{status.phone_number ? <> as <b>+{status.phone_number}</b></> : null} · sent{' '}
              <b>{status.sent_today}</b>/{status.cap_today ?? '—'} today
            </span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Sending limits (warm-up)</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            New numbers start at the base cap; it doubles weekly up to the maximum. Keep these
            conservative — aggressive sending from a fresh number risks a WhatsApp ban.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <LimitField
              label="Day-1 daily cap"
              value={limitsDraft.dailyCapBase}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, dailyCapBase: v })}
            />
            <LimitField
              label="Max daily cap"
              value={limitsDraft.dailyCapMax}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, dailyCapMax: v })}
            />
            <LimitField
              label="Gap between bulk sends (s)"
              value={limitsDraft.minDelaySeconds}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, minDelaySeconds: v })}
            />
            <button
              onClick={handleSaveLimits}
              style={{
                padding: '8px 14px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: limitsSaved ? 'var(--stage-attended)' : 'var(--accent)',
                color: 'white', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {limitsSaved ? 'Saved' : 'Save limits'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ChannelStatus['status'] }) {
  const map = {
    connected: { label: 'Connected', bg: 'var(--stage-attended)' },
    pending_qr: { label: 'Waiting for scan', bg: 'var(--accent)' },
    disconnected: { label: 'Not connected', bg: 'var(--text-tertiary)' },
  } as const
  const { label, bg } = map[status]
  return (
    <span style={{ fontSize: 10, background: bg, color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
      {label}
    </span>
  )
}

function LimitField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
      {label}
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: 130, padding: '8px 10px', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', background: 'var(--card)', fontSize: 13,
          color: 'var(--text-primary)', outline: 'none',
        }}
      />
    </label>
  )
}
