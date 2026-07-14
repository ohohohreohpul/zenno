'use client'

import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Send,
  Bot,
  Reply,
  CalendarCheck,
} from 'lucide-react'

// Stage color constants (mirrors tokens.css)
const STAGE_COLORS: Record<string, string> = {
  inquiry: '#6B7280',
  qualified: '#2563EB',
  trial_booked: '#7C3AED',
  attended: '#059669',
  reviewed: '#D97706',
  rebooked: '#0891B2',
  vip: '#DC2626',
}

const STAGE_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  qualified: 'Qualified',
  trial_booked: 'Trial Booked',
  attended: 'Attended',
  reviewed: 'Reviewed',
  rebooked: 'Rebooked',
  vip: 'VIP',
}

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  line: '#06C755',
  webchat: '#6B7280',
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  line: 'LINE',
  webchat: 'Webchat',
}

interface AnalyticsData {
  contacts_total: number
  messages_total: number
  ai_messages: number
  reply_rate: number
  bookings_week?: number
  stage_counts: Record<string, number>
  channel_counts: Record<string, number>
  volume_by_day: { label: string; inbound: number; outbound: number }[]
}

interface AgencyData {
  name?: string
}

interface ConversationData {
  contact: { id: string; name: string | null; lifecycle_stage: string; channel: string }
  last_message: { content: string } | null
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  hero?: boolean
}

function KpiCard({ icon: Icon, label, value, sub, hero }: KpiCardProps) {
  return (
    <div
      style={{
        background: hero ? 'var(--accent)' : 'var(--card)',
        border: hero ? '1px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 20,
        cursor: 'default',
        transition: `box-shadow var(--duration-fast) var(--ease-out-expo)`,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={15} color={hero ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)'} strokeWidth={1.75} />
        <span style={{ fontSize: 12.5, color: hero ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: hero ? 'var(--text-inverse)' : 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11.5, color: hero ? 'rgba(255,255,255,0.6)' : 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: AnalyticsData['volume_by_day'] }) {
  const maxVal = Math.max(...data.map((d) => d.inbound + d.outbound), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
      {data.map((day) => {
        const total = day.inbound + day.outbound
        const barPx = Math.round((total / maxVal) * 118)
        const inPct = total > 0 ? (day.inbound / total) * 100 : 50

        return (
          <div key={day.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' }}>
            <div
              style={{
                width: '100%',
                height: barPx,
                minHeight: 4,
                borderRadius: '4px 4px 0 0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              <div style={{ height: `${100 - inPct}%`, background: '#93C5FD', minHeight: 2 }} />
              <div style={{ height: `${inPct}%`, background: '#1A1714', minHeight: 2 }} />
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{day.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Lifecycle Funnel ──────────────────────────────────────────────────────────

function LifecycleFunnel({ stageCounts }: { stageCounts: Record<string, number> }) {
  const total = Object.values(stageCounts).reduce((a, b) => a + b, 0) || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Object.keys(STAGE_LABELS).map((s) => {
        const count = stageCounts[s] ?? 0
        const pct = Math.round((count / total) * 100)
        return (
          <div key={s}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{STAGE_LABELS[s]}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{count} · {pct}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--accent-subtle)', borderRadius: 99 }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: STAGE_COLORS[s],
                  borderRadius: 99,
                  transition: 'width 0.6s var(--ease-out-expo)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TopContacts({ conversations }: { conversations: ConversationData[] }) {
  if (conversations.length === 0) {
    return <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No customer conversations yet</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {conversations.slice(0, 5).map(({ contact, last_message }, i) => (
        <div
          key={contact.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: i < Math.min(conversations.length, 5) - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              flexShrink: 0,
            }}
          >
            {(contact.name ?? 'Customer')[0]}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 1 }}>{contact.name ?? 'Customer'}</div>
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {last_message?.content ?? 'No messages yet'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 500,
                color: STAGE_COLORS[contact.lifecycle_stage] ?? STAGE_COLORS.inquiry,
                background: `${STAGE_COLORS[contact.lifecycle_stage] ?? STAGE_COLORS.inquiry}18`,
                padding: '2px 7px',
                borderRadius: 99,
              }}
            >
              {STAGE_LABELS[contact.lifecycle_stage] ?? 'Inquiry'}
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#fff',
                background: CHANNEL_COLORS[contact.channel] ?? CHANNEL_COLORS.webchat,
                padding: '1px 6px',
                borderRadius: 99,
              }}
            >
              {CHANNEL_LABELS[contact.channel] ?? contact.channel}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Channel Breakdown ─────────────────────────────────────────────────────────

function ChannelBreakdown({ channelCounts }: { channelCounts: Record<string, number> }) {
  const total = Object.values(channelCounts).reduce((a, b) => a + b, 0) || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.keys(CHANNEL_LABELS).map((ch) => {
        const count = channelCounts[ch] ?? 0
        const pct = Math.round((count / total) * 100)
        return (
          <div key={ch}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHANNEL_COLORS[ch] }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{CHANNEL_LABELS[ch]}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{count} · {pct}%</span>
            </div>
            <div style={{ height: 5, background: 'var(--accent-subtle)', borderRadius: 99 }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: CHANNEL_COLORS[ch],
                  borderRadius: 99,
                  transition: 'width 0.6s var(--ease-out-expo)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [agency, setAgency] = useState<AgencyData | null>(null)
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics?workspaceId=ws-1').then((r) => r.json()),
      fetch('/api/agency').then((r) => r.json()),
      fetch('/api/conversations?workspaceId=ws-1').then((r) => r.json()),
    ])
      .then(([analyticsRes, agencyRes, conversationRes]) => {
        setAnalytics(analyticsRes)
        setAgency(agencyRes.data ?? {})
        setConversations(conversationRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
        Loading...
      </div>
    )
  }

  if (!analytics) return null

  const aiPct = analytics.messages_total > 0
    ? Math.round((analytics.ai_messages / analytics.messages_total) * 100)
    : 0
  const workspaceName = agency?.name ?? 'Zenno'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Dashboard
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>Last 7 days</span>
          <div
            style={{
              background: 'var(--accent-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {workspaceName}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Row 1: KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <KpiCard icon={CalendarCheck} label="Bookings" value={(analytics.bookings_week ?? 0).toLocaleString()} sub="booked by the agent this week" hero />
          <KpiCard icon={MessageSquare} label="Conversations" value={analytics.contacts_total.toLocaleString()} />
          <KpiCard icon={Send} label="Messages Sent" value={analytics.messages_total.toLocaleString()} />
          <KpiCard icon={Bot} label="AI Replies" value={analytics.ai_messages.toLocaleString()} sub={`${aiPct}% of total`} />
          <KpiCard icon={Reply} label="Replied" value={`${analytics.reply_rate ?? 0}%`} sub="reply rate" />
        </div>

        {/* Row 2: Chart + Funnel */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <Panel title="Performance Over Time">
            <div style={{ display: 'flex', gap: 16, marginBottom: -4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1A1714' }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>Inbound</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#93C5FD' }} />
                <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>Outbound</span>
              </div>
            </div>
            {analytics.volume_by_day.length > 0
              ? <BarChart data={analytics.volume_by_day} />
              : (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No data
                </div>
              )
            }
          </Panel>

          <Panel title="Lifecycle Funnel">
            <LifecycleFunnel stageCounts={analytics.stage_counts} />
          </Panel>
        </div>

        {/* Row 3: Contacts + Channels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Panel title="Top Contacts">
            <TopContacts conversations={conversations} />
          </Panel>

          <Panel title="Channel Breakdown">
            <ChannelBreakdown channelCounts={analytics.channel_counts} />
          </Panel>
        </div>

      </div>
    </div>
  )
}
