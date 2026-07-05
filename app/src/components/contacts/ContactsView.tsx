'use client'

import { useEffect, useState } from 'react'
import { Search, MoreHorizontal } from 'lucide-react'
import { ChannelBadge } from '@/components/ui/ChannelBadge'
import { StagePill } from '@/components/ui/StagePill'
import type { Contact, LifecycleStage } from '@/types'

const STAGES: LifecycleStage[] = [
  'inquiry', 'qualified', 'trial_booked', 'attended', 'reviewed', 'rebooked', 'vip',
]

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  yoga:    { bg: '#EDE9FE', color: '#5B21B6' },
  trial:   { bg: '#DBEAFE', color: '#1D4ED8' },
  spa:     { bg: '#D1FAE5', color: '#065F46' },
  vip:     { bg: '#FEF3C7', color: '#92400E' },
  inquiry: { bg: '#E0E7FF', color: '#3730A3' },
  lead:    { bg: '#F3F4F6', color: '#374151' },
}

const CONTACT_TAGS: Record<string, string[]> = {
  'Mia Tanaka':    ['yoga', 'trial'],
  'Lena Hoffmann': ['spa', 'vip'],
  'Sarah Chen':    ['inquiry'],
}

function getTagsForContact(name: string | null): string[] {
  if (!name) return []
  const exact = CONTACT_TAGS[name]
  if (exact) return exact
  return ['lead']
}

function isBotActive(stage: LifecycleStage | null): boolean {
  return stage === 'inquiry' || stage === 'qualified'
}

interface ToggleProps {
  on: boolean
  onChange: () => void
  onColor?: string
}

function Toggle({ on, onChange, onColor = '#059669' }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 32,
        height: 18,
        borderRadius: 99,
        background: on ? onColor : '#D1C9BE',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 150ms',
        flexShrink: 0,
      }}
      aria-checked={on}
      role="switch"
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 14 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 150ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

function TagChip({ tag }: { tag: string }) {
  const colors = TAG_COLORS[tag] ?? { bg: '#F3F4F6', color: '#374151' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 99,
        background: colors.bg,
        color: colors.color,
        fontSize: 10,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {tag}
    </span>
  )
}

interface RowState {
  botActive: boolean
  dnd: boolean
}

function buildInitialRowState(contacts: Contact[]): Record<string, RowState> {
  return Object.fromEntries(
    contacts.map((c) => [
      c.id,
      { botActive: isBotActive(c.lifecycle_stage), dnd: false },
    ])
  )
}

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<LifecycleStage | 'all'>('all')
  const [rowState, setRowState] = useState<Record<string, RowState>>({})

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((d) => {
        const data: Contact[] = d.data ?? []
        setContacts(data)
        setRowState(buildInitialRowState(data))
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = contacts.filter((c) => {
    const matchesStage = stageFilter === 'all' || c.lifecycle_stage === stageFilter
    const matchesQuery =
      !query || c.name?.toLowerCase().includes(query.toLowerCase())
    return matchesStage && matchesQuery
  })

  const stageCounts = Object.fromEntries(
    STAGES.map((s) => [s, contacts.filter((c) => c.lifecycle_stage === s).length])
  )

  function toggleBot(id: string) {
    setRowState((prev) => ({
      ...prev,
      [id]: { ...prev[id], botActive: !prev[id]?.botActive },
    }))
  }

  function toggleDnd(id: string) {
    setRowState((prev) => ({
      ...prev,
      [id]: { ...prev[id], dnd: !prev[id]?.dnd },
    }))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Contacts
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', flex: 1 }}>
          {contacts.length} total
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <ActionButton label="Export" variant="ghost" />
          <ActionButton label="Import" variant="ghost" />
          <ActionButton label="New Contact" variant="dark" />
        </div>
      </div>

      {/* Lifecycle filter strip */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        <StageFilterChip
          label="All"
          count={contacts.length}
          active={stageFilter === 'all'}
          onClick={() => setStageFilter('all')}
        />
        {STAGES.map((s) => (
          <StageFilterChip
            key={s}
            label={s.replace('_', ' ')}
            count={stageCounts[s] ?? 0}
            active={stageFilter === s}
            onClick={() => setStageFilter(s)}
          />
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--accent-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            maxWidth: 360,
          }}
        >
          <Search size={13} color="var(--text-tertiary)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 24, color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--sidebar)' }}>
                {['Name', 'Channel', 'Stage', 'Tags', 'Last Active', 'Bot Active', 'DND', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const rs = rowState[c.id] ?? { botActive: false, dnd: false }
                const tags = getTagsForContact(c.name)
                return (
                  <tr
                    key={c.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 150ms' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: 'var(--accent-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            flexShrink: 0,
                          }}
                        >
                          {(c.name ?? c.external_id).charAt(0).toUpperCase()}
                        </div>
                        <span
                          style={{
                            fontWeight: 500,
                            fontSize: 13.5,
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {c.name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ChannelBadge channel={c.channel} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StagePill stage={c.lifecycle_stage} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {tags.slice(0, 2).map((tag) => (
                          <TagChip key={tag} tag={tag} />
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {new Date(c.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Toggle on={rs.botActive} onChange={() => toggleBot(c.id)} onColor="#059669" />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Toggle on={rs.dnd} onChange={() => toggleDnd(c.id)} onColor="#D97706" />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--text-tertiary)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ActionButton({ label, variant }: { label: string; variant: 'ghost' | 'dark' }) {
  const isDark = variant === 'dark'
  return (
    <button
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: '7px 12px',
        borderRadius: 'var(--radius-sm)',
        border: isDark ? 'none' : '1px solid var(--border)',
        background: isDark ? 'var(--accent)' : 'transparent',
        color: isDark ? '#fff' : 'var(--text-primary)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'opacity 150ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {label}
    </button>
  )
}

function StageFilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 99,
        border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 150ms',
        textTransform: 'capitalize',
      }}
    >
      {label}
      <span
        style={{
          fontSize: 10,
          opacity: 0.7,
          background: active ? 'rgba(255,255,255,0.2)' : 'var(--border)',
          borderRadius: 99,
          padding: '0 5px',
        }}
      >
        {count}
      </span>
    </button>
  )
}
