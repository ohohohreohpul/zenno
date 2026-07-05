'use client'

import { useState } from 'react'
import { Check, ShieldCheck, X } from 'lucide-react'

const SAVED_FEEDBACK_MS = 2000
const MIN_DISCOUNT = 0
const MAX_DISCOUNT = 100

export interface Guardrails {
  alwaysEscalateTopics: string[]
  maxDiscountPercent: number | null
  businessHoursOnly: boolean
}

export const DEFAULT_GUARDRAILS: Guardrails = {
  alwaysEscalateTopics: [],
  maxDiscountPercent: null,
  businessHoursOnly: false,
}

interface GuardrailsSectionProps {
  guardrails: Guardrails
  onChange: (next: Guardrails) => void
}

const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: 3 }
const hintStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }

export function GuardrailsSection({ guardrails, onChange }: GuardrailsSectionProps) {
  const [topicInput, setTopicInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function addTopic() {
    const topic = topicInput.trim()
    if (!topic || guardrails.alwaysEscalateTopics.includes(topic)) return
    onChange({ ...guardrails, alwaysEscalateTopics: [...guardrails.alwaysEscalateTopics, topic] })
    setTopicInput('')
  }

  function removeTopic(topic: string) {
    onChange({ ...guardrails, alwaysEscalateTopics: guardrails.alwaysEscalateTopics.filter((t) => t !== topic) })
  }

  function handleDiscountChange(raw: string) {
    if (raw === '') {
      onChange({ ...guardrails, maxDiscountPercent: null })
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    const clamped = Math.min(MAX_DISCOUNT, Math.max(MIN_DISCOUNT, parsed))
    onChange({ ...guardrails, maxDiscountPercent: clamped })
  }

  async function handleSave() {
    setSaveError(null)
    try {
      const res = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'ws-1', guardrails }),
      })
      if (!res.ok) throw new Error(`Save failed with status ${res.status}`)
      setSaved(true)
      setTimeout(() => setSaved(false), SAVED_FEEDBACK_MS)
    } catch {
      setSaveError('Could not save guardrails. Please try again.')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <ShieldCheck size={15} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Guardrails</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        Hard rules the agent can never break — regardless of what the customer says.
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Always escalate to a human</label>
          <div style={hintStyle}>Topics the agent hands to your team instead of answering.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: guardrails.alwaysEscalateTopics.length > 0 ? 8 : 0 }}>
            {guardrails.alwaysEscalateTopics.map((topic) => (
              <span
                key={topic}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent-subtle)', color: 'var(--text-primary)', fontSize: 12, padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
              >
                {topic}
                <button
                  onClick={() => removeTopic(topic)}
                  aria-label={`Remove ${topic}`}
                  style={{ display: 'inline-flex', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <input
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTopic()
              }
            }}
            placeholder="refunds, injuries, complaints…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>

        <div>
          <label style={labelStyle}>Maximum discount</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <input
              type="number"
              min={MIN_DISCOUNT}
              max={MAX_DISCOUNT}
              value={guardrails.maxDiscountPercent ?? ''}
              onChange={(e) => handleDiscountChange(e.target.value)}
              style={{ width: 90, boxSizing: 'border-box', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
          </div>
          <div style={{ ...hintStyle, marginBottom: 0 }}>The agent never offers more than this. Leave empty for: no discount talk limit.</div>
        </div>

        <div>
          <label style={labelStyle}>Business hours only</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              role="switch"
              aria-checked={guardrails.businessHoursOnly}
              onClick={() => onChange({ ...guardrails, businessHoursOnly: !guardrails.businessHoursOnly })}
              style={{
                width: 32,
                height: 18,
                borderRadius: 99,
                border: 'none',
                padding: 2,
                cursor: 'pointer',
                background: guardrails.businessHoursOnly ? 'var(--stage-attended)' : 'var(--border-strong)',
                display: 'flex',
                justifyContent: guardrails.businessHoursOnly ? 'flex-end' : 'flex-start',
                transition: 'background var(--duration-fast)',
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', display: 'block' }} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Outbound campaigns and broadcasts only send during business hours.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          {saveError && <span style={{ fontSize: 12, color: 'var(--stage-vip)' }}>{saveError}</span>}
          <button
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-sm)', background: saved ? 'var(--stage-attended)' : 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background var(--duration-fast)' }}
          >
            {saved ? <><Check size={13} /> Saved</> : 'Save guardrails'}
          </button>
        </div>
      </div>
    </div>
  )
}
