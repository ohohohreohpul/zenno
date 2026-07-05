import { MessageSquare } from 'lucide-react'

export function EmptyState() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'var(--text-tertiary)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MessageSquare size={20} color="var(--text-secondary)" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Select a conversation
        </div>
        <div style={{ fontSize: 13, marginTop: 4 }}>
          Choose one from the list to start
        </div>
      </div>
    </div>
  )
}
