'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, CircleCheck, Loader2, Phone, QrCode, Unplug, X } from 'lucide-react'

/**
 * Connect the workspace's own WhatsApp number by scanning a QR with the
 * WhatsApp app (Linked Devices). Shows connection state, the live QR while
 * pairing, and the warm-up send limits once connected.
 */

interface Limits {
  dailyCapBase: number
  dailyCapMax: number
  newContactCapBase: number
  newContactCapMax: number
  rampDays: number
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
  new_contact_cap_today: number | null
  new_contacts_today: number
  warmup_day: number
  ramp_days: number
  tomorrow_cap: number | null
  tomorrow_new_contact_cap: number | null
}

const POLL_INTERVAL_MS = 3000
const WORKSPACE_ID = 'ws-1'
type ConnectView = 'intro' | 'qr' | 'phone'

export function WhatsAppConnectCard() {
  const [status, setStatus] = useState<ChannelStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitsDraft, setLimitsDraft] = useState<Limits | null>(null)
  const [limitsSaved, setLimitsSaved] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [connectView, setConnectView] = useState<ConnectView>('intro')
  const [phoneNumber, setPhoneNumber] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels/whatsapp?workspaceId=${WORKSPACE_ID}`)
      if (!res.ok) throw new Error(`Status check failed (${res.status})`)
      const body = (await res.json()) as { data: ChannelStatus }
      setStatus(body.data)
      if (body.data.status === 'connected') setDialogOpen(false)
      setLimitsDraft((prev) => prev ?? body.data.limits)
    } catch {
      setError('Could not reach the server')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { void refresh() }, 0)
    return () => clearTimeout(timer)
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

  function openConnection() {
    setError(null)
    setConnectView(status?.status === 'pending_qr' ? 'qr' : 'intro')
    setDialogOpen(true)
  }

  async function handleConnect(pairingPhoneNumber?: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/channels/whatsapp?workspaceId=${WORKSPACE_ID}`, {
        method: 'POST',
        ...(pairingPhoneNumber
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone_number: pairingPhoneNumber }),
            }
          : {}),
      })
      const body = (await res.json()) as { data?: ChannelStatus; error?: string }
      if (!res.ok || !body.data) throw new Error(body.error ?? 'Connect failed')
      setStatus(body.data)
      setConnectView('qr')
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
          new_contact_cap_base: limitsDraft.newContactCapBase,
          new_contact_cap_max: limitsDraft.newContactCapMax,
          ramp_days: limitsDraft.rampDays,
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
    <>
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
        Connect any personal or business number by scanning a QR, like WhatsApp Web.
      </div>

      {status.status === 'disconnected' && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.24)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14, lineHeight: 1.55 }}>
          <b>Linked-device connection.</b> This uses WhatsApp Web rather than the official
          Business API. WhatsApp may restrict numbers that send spam or unusually high
          volumes. Connect only a number you control and use campaigns responsibly.
        </div>
      )}

      {!status.gateway_configured && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--sidebar)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
          The session gateway is not configured yet. Set <code>WA_GATEWAY_URL</code> and{' '}
          <code>WA_GATEWAY_API_KEY</code> to enable connecting a number.
        </div>
      )}

      {status.gateway_configured && status.status === 'disconnected' && (
        <button
          onClick={openConnection}
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
        <button
          onClick={openConnection}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          <QrCode size={14} /> Continue WhatsApp setup
        </button>
      )}

      {status.status === 'connected' && limitsDraft && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
            <Check size={14} style={{ color: 'var(--stage-attended)' }} />
            <span>
              Connected{status.phone_number ? <> as <b>+{status.phone_number}</b></> : null}
            </span>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--sidebar)', padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, fontSize: 12 }}>
              <b>WhatsApp warm-up</b>
              <span style={{ color: 'var(--stage-attended)' }}>Day {Math.min(status.warmup_day, status.ramp_days)} of {status.ramp_days}</span>
            </div>
            <WarmupMeter label="Proactive messages today" value={status.sent_today} cap={status.cap_today ?? 0} />
            <WarmupMeter label="New contacts today" value={status.new_contacts_today} cap={status.new_contact_cap_today ?? 0} />
            {status.new_contact_cap_today === 0 && (
              <div style={{ fontSize: 11, color: '#d97706', marginTop: 8 }}>Cold outreach is disabled during the first warm-up days.</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 9 }}>
              Tomorrow: {status.tomorrow_cap ?? '—'} messages / {status.tomorrow_new_contact_cap ?? '—'} new contacts · Full capacity in {Math.max(0, status.ramp_days - status.warmup_day)} days
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Campaign safety limits</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            These limits apply to campaigns and broadcasts only. AI and human replies are never
            blocked. Proactive volume ramps gradually up to full capacity.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <LimitField
              label="Day-1 campaign cap"
              value={limitsDraft.dailyCapBase}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, dailyCapBase: v })}
            />
            <LimitField
              label="Max campaign cap"
              value={limitsDraft.dailyCapMax}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, dailyCapMax: v })}
            />
            <LimitField
              label="Day-1 new contacts"
              value={limitsDraft.newContactCapBase}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, newContactCapBase: v })}
            />
            <LimitField
              label="Max new contacts"
              value={limitsDraft.newContactCapMax}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, newContactCapMax: v })}
            />
            <LimitField
              label="Warm-up days"
              value={limitsDraft.rampDays}
              onChange={(v) => setLimitsDraft({ ...limitsDraft, rampDays: v })}
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
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(10, 15, 25, 0.62)', zIndex: 1000 }} />
        <Dialog.Content
          style={{
            position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 'min(560px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto',
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18,
            boxShadow: '0 28px 80px rgba(0,0,0,0.28)', padding: 24, zIndex: 1001,
          }}
        >
          <Dialog.Close asChild>
            <button aria-label="Close" style={{ position: 'absolute', top: 18, right: 18, border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </Dialog.Close>

          {connectView === 'intro' && (
            <WhatsAppIntro busy={busy} error={error} onConnect={() => void handleConnect()} />
          )}

          {connectView === 'phone' && (
            <PhonePairingForm
              value={phoneNumber}
              busy={busy}
              error={error}
              onChange={setPhoneNumber}
              onBack={() => setConnectView('qr')}
              onSubmit={() => void handleConnect(phoneNumber)}
            />
          )}

          {connectView === 'qr' && (
            <PairingView
              status={status}
              busy={busy}
              error={error}
              onUsePhone={() => { setError(null); setConnectView('phone') }}
              onUseQr={() => void handleConnect()}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  )
}

function WhatsAppIntro({ busy, error, onConnect }: { busy: boolean; error: string | null; onConnect: () => void }) {
  return (
    <div>
      <Dialog.Title style={{ fontSize: 22, fontWeight: 700, margin: '2px 36px 4px 0' }}>Connect your WhatsApp</Dialog.Title>
      <Dialog.Description style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>
        Use your existing personal or business number. No WhatsApp Business API account needed.
      </Dialog.Description>

      <div style={{ border: '1px solid rgba(34,197,94,0.55)', background: 'rgba(34,197,94,0.045)', borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}><QrCode size={22} /></div>
            <div><div style={{ fontWeight: 650, fontSize: 16 }}>WhatsApp Web</div><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Recommended · connects in seconds</div></div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'white', background: '#22c55e', padding: '5px 8px', borderRadius: 7 }}>RECOMMENDED</span>
        </div>

        <Feature icon={<CircleCheck size={14} />} text="Scan a QR and keep using your existing WhatsApp" />
        <Feature icon={<CircleCheck size={14} />} text="The AI responds as your connected number, 24/7" />
        <Feature icon={<CircleCheck size={14} />} text="Customer replies are never blocked by campaign quotas" />

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '14px 0 16px', padding: 11, borderRadius: 9, background: 'rgba(245,158,11,0.10)', color: 'var(--text-secondary)', fontSize: 11.5, lineHeight: 1.5 }}>
          <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
          Linked Devices is not the official Business API. WhatsApp may restrict numbers used for spam or unusually high-volume outreach. Campaign safeguards are enabled by default.
        </div>

        <button onClick={onConnect} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 9, padding: '10px 16px', background: '#22c55e', color: 'white', fontWeight: 650, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? <Loader2 size={15} className="spin" /> : <QrCode size={15} />} Connect via QR code
        </button>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>}
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 9 }}><span style={{ color: '#22c55e', display: 'flex' }}>{icon}</span>{text}</div>
}

function PhonePairingForm({ value, busy, error, onChange, onBack, onSubmit }: { value: string; busy: boolean; error: string | null; onChange: (value: string) => void; onBack: () => void; onSubmit: () => void }) {
  const digits = value.replace(/\D/g, '')
  const valid = /^\d{8,15}$/.test(digits)
  return (
    <div>
      <Dialog.Title style={{ fontSize: 22, fontWeight: 700, margin: '2px 36px 4px 0' }}>Link with your phone number</Dialog.Title>
      <Dialog.Description style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 22 }}>
        Enter the full international number connected to WhatsApp.
      </Dialog.Description>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>WhatsApp phone number</label>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--sidebar)' }}>
        <span style={{ padding: '12px 13px', borderRight: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>+</span>
        <input autoFocus inputMode="tel" value={value} onChange={(event) => onChange(event.target.value.replace(/[^\d\s()-]/g, ''))} placeholder="49 176 12345678" style={{ flex: 1, minWidth: 0, padding: '12px 13px', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 14 }} />
      </div>
      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', color: 'var(--text-tertiary)', fontSize: 11.5, marginTop: 10, lineHeight: 1.45 }}><Phone size={14} /> Include the country code. Zenno uses this only to request WhatsApp’s pairing code.</div>
      {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 26 }}>
        <button onClick={onBack} style={{ padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Cancel</button>
        <button onClick={onSubmit} disabled={!valid || busy} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: valid ? '#22c55e' : 'var(--border)', color: 'white', fontWeight: 650, cursor: valid && !busy ? 'pointer' : 'not-allowed' }}>{busy && <Loader2 size={14} className="spin" />} Continue</button>
      </div>
    </div>
  )
}

function PairingView({ status, busy, error, onUsePhone, onUseQr }: { status: ChannelStatus; busy: boolean; error: string | null; onUsePhone: () => void; onUseQr: () => void }) {
  const pairingCode = status.pairing_code
  return (
    <div>
      <Dialog.Title style={{ fontSize: 22, fontWeight: 700, margin: '2px 36px 4px 0' }}>Connect WhatsApp</Dialog.Title>
      <Dialog.Description style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        {pairingCode ? 'Enter this code in the WhatsApp mobile app' : 'Scan with the WhatsApp mobile app'}
      </Dialog.Description>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><span style={{ display: 'flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '7px 10px', background: 'rgba(245,158,11,0.11)', color: '#d97706', fontSize: 11.5, fontWeight: 650 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: '#f59e0b' }} /> Waiting for connection…</span></div>

      {pairingCode ? (
        <div style={{ textAlign: 'center', margin: '18px auto 22px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 7 }}>YOUR ONE-TIME PAIRING CODE</div>
          <div style={{ display: 'inline-block', padding: '15px 20px', border: '1px solid rgba(34,197,94,0.38)', borderRadius: 12, background: 'rgba(34,197,94,0.05)', color: 'var(--text-primary)', fontSize: 27, fontWeight: 750, letterSpacing: 4 }}>{pairingCode}</div>
          <button onClick={onUseQr} disabled={busy} style={{ display: 'flex', margin: '16px auto 0', alignItems: 'center', gap: 7, border: 'none', background: 'transparent', color: '#22c55e', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}><QrCode size={15} /> Use QR code instead</button>
        </div>
      ) : (
        <>
          <div style={{ width: 280, height: 280, boxSizing: 'border-box', margin: '0 auto', padding: 12, border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, background: 'white', display: 'grid', placeItems: 'center' }}>
            {status.qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={status.qr} alt="WhatsApp pairing QR code" width={252} height={252} style={{ display: 'block', maxWidth: '100%' }} />
            ) : <Loader2 size={22} className="spin" style={{ color: '#22c55e' }} />}
          </div>
          <button onClick={onUsePhone} style={{ display: 'flex', margin: '17px auto 0', alignItems: 'center', gap: 7, border: 'none', background: 'transparent', color: '#22c55e', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}><Phone size={15} /> Link with phone number instead</button>
        </>
      )}

      <div style={{ marginTop: 22, border: '1px solid rgba(34,197,94,0.22)', background: 'var(--sidebar)', borderRadius: 11, padding: 15 }}>
        <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 10 }}>How to connect</div>
        {(pairingCode
          ? ['Open WhatsApp on your phone', 'Go to Settings → Linked devices', 'Tap Link a device → Link with phone number', 'Enter the one-time code above']
          : ['Open WhatsApp on your phone', 'Go to Settings → Linked devices', 'Tap Link a device', 'Scan this QR code']
        ).map((step, index) => <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 7 }}><span style={{ width: 19, height: 19, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 99, background: 'rgba(34,197,94,0.12)', color: '#22c55e', fontSize: 10, fontWeight: 700 }}>{index + 1}</span>{step}</div>)}
      </div>
      {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--stage-vip)' }}>{error}</div>}
    </div>
  )
}

function WarmupMeter({ label, value, cap }: { label: string; value: number; cap: number }) {
  const progress = cap > 0 ? Math.min(100, (value / cap) * 100) : 0
  return (
    <div style={{ marginTop: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 5 }}>
        <span>{label}</span><span>{value} / {cap}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: '#22c55e' }} />
      </div>
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
