'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { ChannelBadge } from '@/components/ui/ChannelBadge'
import type { Contact, LifecycleStage } from '@/types'

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'inquiry',
  'qualified',
  'trial_booked',
  'attended',
  'reviewed',
  'rebooked',
  'vip',
]

const SAVED_FLASH_MS = 1500

type PatchPayload = Partial<{
  tags: string[]
  botActive: boolean
  dnd: boolean
  chatStatus: 'open' | 'closed'
  attentionRequired: boolean
  lifecycleStage: LifecycleStage
  notes: string
  unread: number
}>

export async function patchContact(contactId: string, payload: PatchPayload): Promise<void> {
  const res = await fetch(`/api/contacts/${contactId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Failed to update contact (${res.status})`)
}

interface Props {
  contact: Contact
  onContactUpdate: (contactId: string, changes: Partial<Contact>) => void
}

export function ContactPanel({ contact, onContactUpdate }: Props) {
  function updateField(changes: Partial<Contact>, payload: PatchPayload) {
    const previous = Object.fromEntries(
      Object.keys(changes).map((key) => [key, contact[key as keyof Contact]])
    ) as Partial<Contact>
    onContactUpdate(contact.id, changes)
    patchContact(contact.id, payload).catch(() => {
      onContactUpdate(contact.id, previous)
    })
  }

  return (
    <div
      style={{
        width: 280,
        maxWidth: 280,
        flexShrink: 1,
        minWidth: 220,
        borderLeft: '1px solid var(--border)',
        background: 'var(--card)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '20px 16px',
      }}
    >
      <PanelHeader contact={contact} />
      <ToggleRow
        label="AI Agent"
        isOn={contact.bot_active === true}
        activeColor="var(--stage-attended, #059669)"
        onToggle={(next) => updateField({ bot_active: next }, { botActive: next })}
      />
      <ToggleRow
        label="Do Not Disturb"
        isOn={contact.dnd === true}
        activeColor="var(--stage-reviewed, #D97706)"
        onToggle={(next) => updateField({ dnd: next }, { dnd: next })}
      />
      <StatusSegment
        status={contact.chat_status ?? 'open'}
        onChange={(next) => updateField({ chat_status: next }, { chatStatus: next })}
      />
      <StageSelect
        stage={contact.lifecycle_stage}
        onChange={(next) => updateField({ lifecycle_stage: next }, { lifecycleStage: next })}
      />
      <TagsEditor
        tags={contact.tags ?? []}
        onChange={(next) => updateField({ tags: next }, { tags: next })}
      />
      <NotesEditor
        contactId={contact.id}
        notes={contact.notes ?? ''}
        onSave={(next) => updateField({ notes: next }, { notes: next })}
      />
    </div>
  )
}

function PanelHeader({ contact }: { contact: Contact }) {
  const name = contact.name ?? contact.external_id
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', textAlign: 'center' }}>
        {name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ChannelBadge channel={contact.channel} size="xs" />
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{contact.external_id}</span>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  isOn,
  activeColor,
  onToggle,
}: {
  label: string
  isOn: boolean
  activeColor: string
  onToggle: (next: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
      <button
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        onClick={() => onToggle(!isOn)}
        style={{
          width: 32,
          height: 18,
          borderRadius: 99,
          border: 'none',
          background: isOn ? activeColor : 'var(--border)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background var(--duration-fast)',
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: isOn ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left var(--duration-fast)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          }}
        />
      </button>
    </div>
  )
}

function StatusSegment({
  status,
  onChange,
}: {
  status: 'open' | 'closed'
  onChange: (next: 'open' | 'closed') => void
}) {
  return (
    <div>
      <SectionLabel>Chat status</SectionLabel>
      <div
        style={{
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
        }}
      >
        {(['open', 'closed'] as const).map((value) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              background: status === value ? 'var(--accent)' : 'transparent',
              color: status === value ? 'var(--text-inverse)' : 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'background var(--duration-fast)',
            }}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}

function StageSelect({
  stage,
  onChange,
}: {
  stage: LifecycleStage
  onChange: (next: LifecycleStage) => void
}) {
  return (
    <div>
      <SectionLabel>Lifecycle stage</SectionLabel>
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value as LifecycleStage)}
        style={{
          width: '100%',
          padding: '7px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          fontSize: 13,
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
      >
        {LIFECYCLE_STAGES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </div>
  )
}

function TagsEditor({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('')

  function handleAdd() {
    const value = draft.trim()
    if (!value || tags.includes(value)) return
    onChange([...tags, value])
    setDraft('')
  }

  return (
    <div>
      <SectionLabel>Tags</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--accent-subtle)',
              borderRadius: 99,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            {tag}
            <button
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              aria-label={`Remove tag ${tag}`}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                padding: 0,
                color: 'var(--text-tertiary)',
              }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleAdd()
          }
        }}
        placeholder="Add tag + Enter"
        style={{
          width: '100%',
          padding: '6px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          fontSize: 12,
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
    </div>
  )
}

function NotesEditor({
  contactId,
  notes,
  onSave,
}: {
  contactId: string
  notes: string
  onSave: (next: string) => void
}) {
  const [draft, setDraft] = useState(notes)
  const [editingId, setEditingId] = useState(contactId)
  const [isSavedVisible, setIsSavedVisible] = useState(false)

  if (editingId !== contactId) {
    setEditingId(contactId)
    setDraft(notes)
  }

  function handleBlur() {
    if (draft === notes) return
    onSave(draft)
    setIsSavedVisible(true)
    setTimeout(() => setIsSavedVisible(false), SAVED_FLASH_MS)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>Notes</SectionLabel>
        {isSavedVisible && (
          <span style={{ fontSize: 10, color: 'var(--stage-attended, #059669)', fontWeight: 500 }}>
            Saved
          </span>
        )}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        rows={4}
        placeholder="Internal notes…"
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          fontSize: 12.5,
          lineHeight: 1.5,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
        }}
      />
    </div>
  )
}
