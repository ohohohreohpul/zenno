import type { Channel } from '@/types'

const CHANNEL_META: Record<Channel, { label: string; color: string }> = {
  whatsapp:  { label: 'WA',  color: 'var(--channel-whatsapp)' },
  instagram: { label: 'IG',  color: 'var(--channel-instagram)' },
  messenger: { label: 'MSG', color: 'var(--channel-messenger)' },
  telegram:  { label: 'TG',  color: 'var(--channel-telegram)' },
  line:      { label: 'LINE',color: 'var(--channel-line)' },
  webchat:   { label: 'Web', color: 'var(--channel-webchat)' },
  sms:       { label: 'SMS', color: '#6B7280' },
  email:     { label: 'Email',color: '#6B7280' },
}

export function ChannelBadge({ channel, size = 'sm' }: { channel: Channel; size?: 'xs' | 'sm' }) {
  const meta = CHANNEL_META[channel] ?? { label: channel, color: '#6B7280' }
  const fontSize = size === 'xs' ? 9 : 10
  const padding = size === 'xs' ? '1px 4px' : '2px 6px'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.03em',
        color: meta.color,
        background: `${meta.color}18`,
        borderRadius: 3,
        padding,
        lineHeight: 1.4,
      }}
    >
      {meta.label}
    </span>
  )
}
