'use client'

import { useEffect, useState } from 'react'
import { MessageSquareText, Plus } from 'lucide-react'

interface AutomationStats {
  commentsCaptured: number
  dmsSent: number
  booked: number
}

interface Automation {
  _id: string
  keyword: string
  postLabel: string
  openingDm: string
  status: 'active' | 'paused'
  stats: AutomationStats
  createdAt: string
}

const API_BASE = '/api/comment-automations'

export function CommentToDmTab() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}?workspaceId=ws-1`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json()
      })
      .then((d) => setAutomations(d.data ?? []))
      .catch(() => setError('Could not load automations. Please try again.'))
      .finally(() => setIsLoading(false))
  }, [])

  const toggleStatus = async (automation: Automation) => {
    const nextStatus: Automation['status'] = automation.status === 'active' ? 'paused' : 'active'
    const previous = automations
    setAutomations((prev) =>
      prev.map((a) => (a._id === automation._id ? { ...a, status: nextStatus } : a)),
    )
    try {
      const res = await fetch(`${API_BASE}/${automation._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
    } catch {
      setAutomations(previous)
      setError('Could not update the automation status.')
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Turn Instagram comments into AI-handled conversations. When someone comments your keyword,
        the agent opens a DM and takes it from there.
      </p>

      {error && (
        <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
        ) : automations.length === 0 ? (
          <EmptyAutomations />
        ) : (
          automations.map((a) => (
            <AutomationCard key={a._id} automation={a} onToggle={() => toggleStatus(a)} />
          ))
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          marginTop: 16,
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'var(--accent)',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} />
        New automation
      </button>

      {showModal && (
        <NewAutomationModal
          onClose={() => setShowModal(false)}
          onCreated={(created) => {
            setAutomations((prev) => [...prev, created])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function EmptyAutomations() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '56px 24px',
        textAlign: 'center',
      }}
    >
      <MessageSquareText size={28} color="var(--text-tertiary)" />
      <div style={{ fontSize: 14, fontWeight: 600 }}>No automations yet</div>
    </div>
  )
}

function AutomationCard({
  automation,
  onToggle,
}: {
  automation: Automation
  onToggle: () => void
}) {
  const { keyword, postLabel, openingDm, status, stats } = automation
  const isActive = status === 'active'

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--channel-instagram)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              fontWeight: 700,
              background: 'var(--accent-subtle)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {keyword.toUpperCase()}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{postLabel}</span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            marginTop: 6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {openingDm}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
          {stats.commentsCaptured} comments · {stats.dmsSent} DMs sent ·{' '}
          <span style={{ color: 'var(--stage-attended)', fontWeight: 600 }}>{stats.booked}</span>{' '}
          booked
        </div>
      </div>
      <StatusToggle isActive={isActive} onToggle={onToggle} />
    </div>
  )
}

function StatusToggle({ isActive, onToggle }: { isActive: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={isActive ? 'Pause automation' : 'Activate automation'}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: 'none',
        background: isActive ? 'var(--stage-attended)' : 'var(--border)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 150ms',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: isActive ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#FFFFFF',
          transition: 'left 150ms',
        }}
      />
    </button>
  )
}

function NewAutomationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (automation: Automation) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [postLabel, setPostLabel] = useState('')
  const [openingDm, setOpeningDm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const submit = async () => {
    if (!keyword.trim() || !postLabel.trim() || !openingDm.trim()) {
      setError('Keyword, post and opening DM are all required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim().toUpperCase(),
          postLabel: postLabel.trim(),
          openingDm: openingDm.trim(),
        }),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const d = await res.json()
      onCreated(d.data)
    } catch {
      setError('Could not create the automation. Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,23,20,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          background: 'var(--card)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          padding: 24,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>New automation</div>

        <ModalField label="Keyword">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value.toUpperCase())}
            placeholder="CLASS"
            style={inputStyle}
          />
        </ModalField>

        <ModalField label="Post">
          <input
            value={postLabel}
            onChange={(e) => setPostLabel(e.target.value)}
            placeholder="Morning Flow reel"
            style={inputStyle}
          />
        </ModalField>

        <ModalField label="Opening DM">
          <textarea
            value={openingDm}
            onChange={(e) => setOpeningDm(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {'Use {{name}} to personalize. After this first message, the AI agent handles the whole conversation.'}
          </div>
        </ModalField>

        {error && <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={ghostButtonStyle}>
            Cancel
          </button>
          <button onClick={submit} disabled={isSaving} style={darkButtonStyle(isSaving)}>
            {isSaving ? 'Creating…' : 'Create automation'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  fontSize: 13,
  background: 'var(--bg)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const ghostButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border)',
  background: 'transparent',
  fontSize: 13,
  cursor: 'pointer',
  color: 'var(--text-secondary)',
}

function darkButtonStyle(isDisabled: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent)',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 500,
    cursor: isDisabled ? 'default' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
  }
}
