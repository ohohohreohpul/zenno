'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Users, Bot } from 'lucide-react'

const STAGES = ['inquiry','qualified','trial_booked','attended','reviewed','rebooked','vip'] as const
const STAGE_LABELS: Record<string, string> = {
  inquiry: 'Inquiry', qualified: 'Qualified', trial_booked: 'Trial Booked',
  attended: 'Attended', reviewed: 'Reviewed', rebooked: 'Rebooked', vip: 'VIP',
}
const STAGE_COLORS: Record<string, string> = {
  inquiry: 'var(--stage-inquiry)', qualified: 'var(--stage-qualified)',
  trial_booked: 'var(--stage-trial-booked)', attended: 'var(--stage-attended)',
  reviewed: 'var(--stage-reviewed)', rebooked: 'var(--stage-rebooked)', vip: 'var(--stage-vip)',
}
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'var(--channel-whatsapp)', instagram: 'var(--channel-instagram)',
  line: 'var(--channel-line)',
  telegram: 'var(--channel-telegram)',
  messenger: 'var(--channel-messenger)', webchat: 'var(--channel-webchat)',
}

interface AnalyticsData {
  contacts_total: number
  messages_total: number
  ai_messages: number
  stage_counts: Record<string, number>
  channel_counts: Record<string, number>
  volume_by_day: { label: string; inbound: number; outbound: number }[]
}

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetch('/api/analytics?workspaceId=ws-1')
      .then((r) => r.json())
      .then(setData)
  }, [])

  if (!data) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
      </div>
    )
  }

  const maxDay = Math.max(...data.volume_by_day.map((d) => d.inbound + d.outbound), 1)
  const totalContacts = data.contacts_total
  const maxStage = Math.max(...STAGES.map((s) => data.stage_counts[s] ?? 0), 1)
  const totalChannels = Object.values(data.channel_counts).reduce((a, b) => a + b, 0) || 1

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>Analytics</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>Lotus Yoga Bangkok · Last 7 days</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <KpiCard icon={<Users size={16} />} label="Total Contacts" value={data.contacts_total} />
          <KpiCard icon={<MessageSquare size={16} />} label="Messages Sent" value={data.messages_total} />
          <KpiCard icon={<Bot size={16} />} label="AI Replies" value={data.ai_messages} sub={`${data.messages_total ? Math.round((data.ai_messages / data.messages_total) * 100) : 0}% of total`} />
        </div>

        {/* Volume chart */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16 }}>Message Volume</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
            {data.volume_by_day.map((d) => {
              return (
                <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 80, gap: 1 }}>
                    <div style={{ width: '100%', height: `${(d.outbound / maxDay) * 100}%`, background: 'var(--accent)', borderRadius: '3px 3px 0 0', minHeight: d.outbound ? 3 : 0 }} />
                    <div style={{ width: '100%', height: `${(d.inbound / maxDay) * 100}%`, background: 'var(--border-strong)', borderRadius: d.outbound ? 0 : '3px 3px 0 0', minHeight: d.inbound ? 3 : 0 }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{d.label}</span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <LegendDot color="var(--accent)" label="Outbound" />
            <LegendDot color="var(--border-strong)" label="Inbound" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Lifecycle funnel */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16 }}>Lifecycle Funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAGES.map((s) => {
                const count = data.stage_counts[s] ?? 0
                const pct = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0
                const barPct = (count / maxStage) * 100
                return (
                  <div key={s}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{STAGE_LABELS[s]}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{count} <span style={{ fontSize: 10 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--accent-subtle)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: STAGE_COLORS[s], borderRadius: 3, transition: 'width 0.4s var(--ease-out-expo)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Channel breakdown */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 16 }}>Channels</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(data.channel_counts).filter(([, v]) => v > 0).map(([ch, count]) => {
                const pct = Math.round((count / totalChannels) * 100)
                return (
                  <div key={ch}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{ch}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{count} <span style={{ fontSize: 10 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: 'var(--accent-subtle)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: CHANNEL_COLORS[ch] ?? 'var(--text-tertiary)', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Donut visual */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <DonutChart counts={data.channel_counts} total={totalChannels} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-tertiary)', marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{value.toLocaleString()}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  )
}

function DonutChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const COLORS: Record<string, string> = {
    whatsapp: '#25D366', instagram: '#E1306C', line: '#00B900', webchat: '#6366F1',
  }
  const SIZE = 80
  const R = 28
  const CX = SIZE / 2
  const circumference = 2 * Math.PI * R

  let offset = 0
  const slices = Object.entries(counts).filter(([, v]) => v > 0).map(([ch, count]) => {
    const pct = count / total
    const dash = pct * circumference
    const slice = { ch, dash, offset, color: COLORS[ch] ?? '#999' }
    offset += dash
    return slice
  })

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--border)" strokeWidth={12} />
      {slices.map((s) => (
        <circle
          key={s.ch}
          cx={CX} cy={CX} r={R}
          fill="none"
          stroke={s.color}
          strokeWidth={12}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={-s.offset}
        />
      ))}
    </svg>
  )
}
