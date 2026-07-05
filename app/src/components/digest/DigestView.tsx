'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, Check, ChevronLeft, ChevronRight } from 'lucide-react'

const WORKSPACE_ID = 'ws-1'

interface Booking {
  contactName: string
  className: string
  startsAt: string
  kind: 'trial' | 'regular' | 'consult'
}

interface Escalation {
  contactId: string
  name: string
  note: string
}

interface TopConversation {
  contactId: string
  name: string
  channel: string
  messageCount: number
  lastMessage: string
}

interface Digest {
  date: string
  conversations_handled: number
  inbound_messages: number
  ai_replies: number
  bookings_created: Booking[]
  escalations: Escalation[]
  top_conversations: TopConversation[]
  narrative: string | null
}

function toDateString(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatBookingTime(iso: string): string {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} · ${time}`
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 10px',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
}

const emptyTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-tertiary)',
}

function NavButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 5,
        display: 'flex',
        alignItems: 'center',
        color: disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Topbar({
  dayOffset,
  dateStr,
  onShift,
  onToday,
}: {
  dayOffset: number
  dateStr: string
  onShift: (delta: number) => void
  onToday: () => void
}) {
  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
      }}
    >
      <h1 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)', margin: 0 }}>
        Daily Summary
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <NavButton onClick={() => onShift(-1)} label="Previous day">
          <ChevronLeft size={15} strokeWidth={1.75} />
        </NavButton>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 76, textAlign: 'center' }}>
          {formatDayLabel(dateStr)}
        </span>
        <NavButton onClick={() => onShift(1)} label="Next day" disabled={dayOffset === 0}>
          <ChevronRight size={15} strokeWidth={1.75} />
        </NavButton>
        {dayOffset !== 0 && (
          <button
            type="button"
            onClick={onToday}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        )}
      </div>
    </header>
  )
}

function NarrativeCard({ narrative }: { narrative: string | null }) {
  return (
    <section
      style={{
        background: 'var(--accent-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-tertiary)',
          marginBottom: 10,
        }}
      >
        Agent Report
      </div>
      {narrative ? (
        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>{narrative}</p>
      ) : (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-tertiary)', margin: 0 }}>
          No summary available — the AI agent writes one when there is activity.
        </p>
      )}
    </section>
  )
}

function StatRow({ digest }: { digest: Digest }) {
  const bookingsCount = digest.bookings_created.length
  const stats = [
    { label: 'Conversations', value: digest.conversations_handled, color: 'var(--text-primary)' },
    { label: 'Inbound', value: digest.inbound_messages, color: 'var(--text-primary)' },
    { label: 'AI Replies', value: digest.ai_replies, color: 'var(--text-primary)' },
    { label: 'Bookings', value: bookingsCount, color: bookingsCount > 0 ? 'var(--stage-attended)' : 'var(--text-primary)' },
  ]
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {stats.map((stat) => (
        <div key={stat.label} style={{ ...cardStyle, padding: '14px 16px' }}>
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginBottom: 4 }}>{stat.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: stat.color }}>{stat.value}</div>
        </div>
      ))}
    </section>
  )
}

function BookingsSection({ bookings }: { bookings: Booking[] }) {
  return (
    <section>
      <h2 style={sectionTitleStyle}>Bookings created</h2>
      {bookings.length === 0 ? (
        <div style={emptyTextStyle}>No bookings this day.</div>
      ) : (
        <div style={cardStyle}>
          {bookings.map((booking, i) => (
            <div
              key={`${booking.contactName}-${booking.startsAt}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              }}
            >
              <CalendarCheck size={16} strokeWidth={1.75} color="var(--stage-attended)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{booking.contactName}</span>
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginLeft: 8 }}>{booking.className}</span>
                {booking.kind === 'trial' && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      color: 'var(--stage-attended)',
                      background: 'var(--accent-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 6px',
                      verticalAlign: 'middle',
                    }}
                  >
                    TRIAL
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {formatBookingTime(booking.startsAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function EscalationsSection({ escalations }: { escalations: Escalation[] }) {
  const router = useRouter()
  return (
    <section>
      <h2 style={sectionTitleStyle}>Needs attention</h2>
      {escalations.length === 0 ? (
        <div style={{ ...emptyTextStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Check size={14} strokeWidth={2} color="var(--stage-attended)" />
          Nothing waiting on you.
        </div>
      ) : (
        <div style={cardStyle}>
          {escalations.map((escalation, i) => (
            <button
              key={escalation.contactId}
              type="button"
              onClick={() => router.push('/dashboard/inbox')}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                padding: '12px 16px',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--stage-reviewed)',
                  flexShrink: 0,
                  alignSelf: 'center',
                }}
              />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                {escalation.name}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{escalation.note}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ConversationsSection({ conversations }: { conversations: TopConversation[] }) {
  if (conversations.length === 0) return null
  return (
    <section>
      <h2 style={sectionTitleStyle}>Busiest conversations</h2>
      <div style={cardStyle}>
        {conversations.map((conversation, i) => (
          <div
            key={conversation.contactId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--accent-subtle)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {conversation.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{conversation.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{conversation.channel}</span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                  {conversation.messageCount} messages
                </span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 2,
                }}
              >
                {conversation.lastMessage}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function DigestView() {
  const [dayOffset, setDayOffset] = useState(0)
  const [digest, setDigest] = useState<Digest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dateStr = toDateString(dayOffset)

  const loadDigest = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/digest?workspaceId=${WORKSPACE_ID}&date=${toDateString(dayOffset)}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const body = await res.json()
      if (!body?.data) throw new Error('Malformed response')
      setDigest(body.data as Digest)
    } catch {
      setDigest(null)
      setError('Could not load the summary.')
    } finally {
      setIsLoading(false)
    }
  }, [dayOffset])

  useEffect(() => {
    loadDigest()
  }, [loadDigest])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <Topbar
        dayOffset={dayOffset}
        dateStr={dateStr}
        onShift={(delta) => setDayOffset((prev) => Math.min(0, prev + delta))}
        onToday={() => setDayOffset(0)}
      />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {isLoading && <div style={emptyTextStyle}>Preparing your summary…</div>}
          {!isLoading && error && (
            <div style={{ fontSize: 13, color: '#B42318', display: 'flex', alignItems: 'center', gap: 12 }}>
              {error}
              <button
                type="button"
                onClick={loadDigest}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 10px',
                  fontSize: 12.5,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}
          {!isLoading && !error && digest && (
            <>
              <NarrativeCard narrative={digest.narrative} />
              <StatRow digest={digest} />
              <BookingsSection bookings={digest.bookings_created} />
              <EscalationsSection escalations={digest.escalations} />
              <ConversationsSection conversations={digest.top_conversations} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
