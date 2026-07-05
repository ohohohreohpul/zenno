'use client'

import type { Channel, Conversation } from '@/types'

interface Props {
  conversations: Conversation[]
  isLoading: boolean
  query: string
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({ conversations, isLoading, query, selectedId, onSelect }: Props) {
  const filtered = conversations.filter((c) => {
    if (!query) return true
    const name = c.contact.name?.toLowerCase() ?? ''
    const preview = c.last_message?.content.toLowerCase() ?? ''
    const q = query.toLowerCase()
    return name.includes(q) || preview.includes(q)
  })

  if (isLoading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 13,
        }}
      >
        No conversations yet
      </div>
    )
  }

  return (
    <div>
      {filtered.map((c) => (
        <ConversationRow
          key={c.contact.id}
          conversation={c}
          selected={c.contact.id === selectedId}
          onClick={() => onSelect(c.contact.id)}
        />
      ))}
    </div>
  )
}

const CHANNEL_COLORS: Record<Channel, string> = {
  whatsapp:  'var(--channel-whatsapp, #25D366)',
  instagram: 'var(--channel-instagram, #E1306C)',
  line:      'var(--channel-line, #00C300)',
  webchat:   'var(--channel-webchat, #3B82F6)',
  sms:       '#6B7280',
  email:     '#6B7280',
}

function ChannelDot({ channel }: { channel: Channel }) {
  const color = CHANNEL_COLORS[channel] ?? '#6B7280'
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  )
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      style={{
        background: 'var(--accent)',
        color: 'var(--text-inverse)',
        borderRadius: 99,
        fontSize: 10,
        fontWeight: 600,
        padding: '1px 6px',
        lineHeight: '16px',
        minWidth: 18,
        textAlign: 'center',
        flexShrink: 0,
      }}
    >
      {count}
    </span>
  )
}

function ConversationRow({
  conversation: { contact, last_message, unread_count },
  selected,
  onClick,
}: {
  conversation: Conversation
  selected: boolean
  onClick: () => void
}) {
  const name = contact.name ?? contact.external_id
  const preview = last_message?.content ?? ''
  const time = last_message ? formatTime(last_message.created_at) : ''
  const isUnread = unread_count > 0
  const isClosed = contact.chat_status === 'closed'

  return (
    <button
      onClick={onClick}
      style={{
        opacity: isClosed ? 0.6 : 1,
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '11px 14px',
        border: 'none',
        background: selected ? 'var(--accent-subtle)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        borderBottom: '1px solid var(--border)',
        transition: 'background var(--duration-fast)',
      }}
    >
      <Avatar name={name} channel={contact.channel} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: isUnread ? 700 : 500,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{time}</span>
        </div>

        <p
          style={{
            fontSize: 12,
            color: isUnread ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            fontWeight: isUnread ? 500 : 400,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {preview || ' '}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <ChannelDot channel={contact.channel} />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
            {contact.channel}
          </span>
          <UnreadBadge count={unread_count} />
          {contact.attention_required && <AttentionIndicator />}
        </div>
      </div>
    </button>
  )
}

function AttentionIndicator() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--stage-reviewed, #D97706)',
          display: 'inline-block',
        }}
      />
      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--stage-reviewed, #D97706)' }}>
        Needs attention
      </span>
    </span>
  )
}

function Avatar({ name, channel }: { name: string; channel: Channel }) {
  const color = CHANNEL_COLORS[channel] ?? '#6B7280'
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: `${color}1A`,
        border: `1.5px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 600,
        color: color,
        flexShrink: 0,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--border)' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 13, width: '60%', background: 'var(--border)', borderRadius: 4 }} />
        <div style={{ height: 12, width: '85%', background: 'var(--border)', borderRadius: 4 }} />
        <div style={{ height: 10, width: '40%', background: 'var(--border)', borderRadius: 4 }} />
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
