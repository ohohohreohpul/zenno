'use client'

import { useState } from 'react'
import { ArrowLeft, Sparkles, Target } from 'lucide-react'
import type { LifecycleStage } from '@/types'

const LIFECYCLE_STAGES: LifecycleStage[] = [
  'inquiry', 'qualified', 'trial_booked', 'attended', 'reviewed', 'rebooked', 'vip',
]

const GOAL_IDEAS = [
  'Welcome the lead, find out what they want, and book them into a free trial this week.',
  'Convert a trial attendee to a paid membership — offer the first-month deal and handle "I need to think about it".',
  'Win back a qualified lead who went quiet. Offer a concrete reason to return and book them in.',
  'Re-engagement: invite a past customer to the next retreat with early-bird pricing.',
  'Upsell a 10-class pack holder to the monthly unlimited — show the value difference.',
]

interface SavedCampaign {
  id: string
  name: string
  triggerStage?: string | null
  goal?: string
}

interface Props {
  campaign?: { id?: string; name: string; trigger_stage: string | null; goal?: string; flow?: unknown[] }
  onSave: (campaign: SavedCampaign) => void
  onCancel: () => void
}

export function CampaignBuilder({ campaign, onSave, onCancel }: Props) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [triggerStage, setTriggerStage] = useState<LifecycleStage | ''>(
    (campaign?.trigger_stage as LifecycleStage) ?? '',
  )
  const [goal, setGoal] = useState(campaign?.goal ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasGoal = goal.trim().length > 0
  const canSave = name.trim() && triggerStage && hasGoal

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        workspaceId: 'ws-1',
        name,
        triggerStage: triggerStage || undefined,
        goal,
      }
      const res = campaign?.id
        ? await fetch(`/api/campaigns/${campaign.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      onSave(data.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 13,
            padding: '6px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Campaign name"
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        />

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: canSave ? 'var(--accent)' : 'var(--border)',
            color: canSave ? 'var(--text-inverse)' : 'var(--text-tertiary)',
            fontSize: 13,
            fontWeight: 500,
            cursor: canSave ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Saving…' : 'Save campaign'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Trigger */}
          <Section
            icon={<Target size={14} />}
            label="Trigger"
            help="The campaign fires the moment a contact reaches this stage — automatically. Each contact gets a personalized AI-written opening message."
          >
            <select
              value={triggerStage}
              onChange={(e) => setTriggerStage(e.target.value as LifecycleStage | '')}
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '9px 12px',
                fontSize: 13.5,
                color: 'var(--text-primary)',
                background: 'var(--bg)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">Select a stage…</option>
              {LIFECYCLE_STAGES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </Section>

          {/* Goal */}
          <Section
            icon={<Sparkles size={14} />}
            label="What should the AI accomplish?"
            help="Write this like a brief to a salesperson. The AI will write a unique opening message for each contact — using what it already knows about them — and then handle the conversation from there."
          >
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={6}
              placeholder="e.g. Welcome the lead, find out what they want, and book them into a free trial class this week. Offer the most relevant class based on what they say."
              style={{
                width: '100%',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: 13.5,
                color: 'var(--text-primary)',
                background: 'var(--card)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: 1.55,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {GOAL_IDEAS.map((idea) => (
                <button
                  key={idea}
                  onClick={() => setGoal(idea)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 99,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text-secondary)',
                    fontSize: 11.5,
                    cursor: 'pointer',
                    maxWidth: '100%',
                    textAlign: 'left',
                  }}
                  title={idea}
                >
                  {idea.slice(0, 42)}…
                </button>
              ))}
            </div>
          </Section>

          {error && (
            <div style={{ fontSize: 13, color: '#B91C1C' }}>{error}</div>
          )}

          <div
            style={{
              fontSize: 12.5,
              color: 'var(--text-tertiary)',
              background: 'var(--accent-subtle)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
              lineHeight: 1.5,
            }}
          >
            No message templates, no wait timers, no branch nodes. You give the agent a goal —
            it writes the conversation. Replies are handled by your sales agent and remembered
            per contact.
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({
  icon,
  label,
  help,
  children,
}: {
  icon: React.ReactNode
  label: string
  help: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.5 }}>{help}</div>
      {children}
    </div>
  )
}
