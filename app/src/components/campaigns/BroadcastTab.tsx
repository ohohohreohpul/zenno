'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface BroadcastTarget {
  contactId: string
  name: string
  channel: string
  stage: string
  message: string
}

const STAGES = ['inquiry', 'qualified', 'trial_booked', 'attended', 'reviewed', 'rebooked', 'vip']
const TAGS = ['yoga', 'spa', 'vip', 'trial', 'inquiry', 'lead', 'retreat']

type Phase = 'idle' | 'loading' | 'previewed' | 'sending' | 'sent'

export function BroadcastTab() {
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [instruction, setInstruction] = useState('')
  const [targets, setTargets] = useState<BroadcastTarget[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [sentCount, setSentCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const toggleIn = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const callBroadcast = async (mode: 'preview' | 'send') => {
    const res = await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: selectedStages, tags: selectedTags, instruction, mode }),
    })
    if (!res.ok) throw new Error(`Request failed (${res.status})`)
    return res.json()
  }

  const runPreview = async () => {
    if (!instruction.trim()) {
      setError('Write a message instruction first.')
      return
    }
    setError(null)
    setPhase('loading')
    try {
      const d = await callBroadcast('preview')
      setTargets(d.data?.targets ?? [])
      setPhase('previewed')
    } catch {
      setError('Preview failed. Please try again.')
      setPhase('idle')
    }
  }

  const runSend = async () => {
    setError(null)
    setPhase('sending')
    try {
      const d = await callBroadcast('send')
      setSentCount(d.data?.sent ?? 0)
      setPhase('sent')
    } catch {
      setError('Sending failed. Please try again.')
      setPhase('previewed')
    }
  }

  const reset = () => {
    setTargets([])
    setSentCount(0)
    setInstruction('')
    setPhase('idle')
    setError(null)
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <ComposeColumn
        selectedStages={selectedStages}
        selectedTags={selectedTags}
        instruction={instruction}
        phase={phase}
        error={error}
        onToggleStage={(s) => setSelectedStages((prev) => toggleIn(prev, s))}
        onToggleTag={(t) => setSelectedTags((prev) => toggleIn(prev, t))}
        onInstructionChange={setInstruction}
        onPreview={runPreview}
        onSend={runSend}
      />
      <PreviewPanel phase={phase} targets={targets} sentCount={sentCount} onReset={reset} />
    </div>
  )
}

interface ComposeColumnProps {
  selectedStages: string[]
  selectedTags: string[]
  instruction: string
  phase: Phase
  error: string | null
  onToggleStage: (stage: string) => void
  onToggleTag: (tag: string) => void
  onInstructionChange: (value: string) => void
  onPreview: () => void
  onSend: () => void
}

function ComposeColumn(props: ComposeColumnProps) {
  const { selectedStages, selectedTags, instruction, phase, error } = props
  const canSend = phase === 'previewed'

  return (
    <div style={{ width: 380, flexShrink: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Compose</div>

      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Audience</div>
      <ChipGroup items={STAGES} selected={selectedStages} onToggle={props.onToggleStage} />
      <div style={{ height: 8 }} />
      <ChipGroup items={TAGS} selected={selectedTags} onToggle={props.onToggleTag} />
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8, marginBottom: 18 }}>
        Leave empty to target everyone. Contacts with Do Not Disturb are always excluded.
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Message instruction</div>
      <textarea
        value={instruction}
        onChange={(e) => props.onInstructionChange(e.target.value)}
        rows={5}
        placeholder="e.g. Invite them to the weekend workshop this Saturday 10am, mention 3 spots left"
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          fontSize: 13,
          background: 'var(--card)',
          color: 'var(--text-primary)',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
        The AI writes a personal message for each contact — not a mail merge.
      </div>

      {error && <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 10 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={props.onPreview}
          disabled={phase === 'loading' || phase === 'sending'}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'transparent',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          Preview
        </button>
        <button
          onClick={props.onSend}
          disabled={!canSend}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--accent)',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 500,
            cursor: canSend ? 'pointer' : 'default',
            opacity: canSend ? 1 : 0.5,
          }}
        >
          {phase === 'sending' ? 'Sending…' : 'Send broadcast'}
        </button>
      </div>
    </div>
  )
}

function ChipGroup({
  items,
  selected,
  onToggle,
}: {
  items: string[]
  selected: string[]
  onToggle: (item: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => {
        const isSelected = selected.includes(item)
        return (
          <button
            key={item}
            onClick={() => onToggle(item)}
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
              background: isSelected ? 'var(--accent)' : 'var(--card)',
              color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {item.replace('_', ' ')}
          </button>
        )
      })}
    </div>
  )
}

function PreviewPanel({
  phase,
  targets,
  sentCount,
  onReset,
}: {
  phase: Phase
  targets: BroadcastTarget[]
  sentCount: number
  onReset: () => void
}) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 20,
        minHeight: 320,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Preview</div>
      {phase === 'sent' ? (
        <SentState sentCount={sentCount} onReset={onReset} />
      ) : phase === 'loading' ? (
        <PulsingText />
      ) : phase === 'previewed' || phase === 'sending' ? (
        <TargetList targets={targets} />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            fontSize: 13,
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            padding: '0 32px',
          }}
        >
          Preview shows the exact personalized message each contact will receive.
        </div>
      )}
    </div>
  )
}

function PulsingText() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        fontSize: 13,
        color: 'var(--text-secondary)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }}
    >
      <style>{'@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }'}</style>
      Writing personalized messages…
    </div>
  )
}

function TargetList({ targets }: { targets: BroadcastTarget[] }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        {targets.length} recipient{targets.length === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {targets.map((t) => (
          <div key={t.contactId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
                color: 'var(--text-secondary)',
              }}
            >
              {t.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {t.name}{' '}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)' }}>
                  {t.stage.replace('_', ' ')}
                </span>
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  background: 'var(--accent-subtle)',
                  borderRadius: 'var(--radius)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                }}
              >
                {t.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SentState({ sentCount, onReset }: { sentCount: number; onReset: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 220,
        gap: 10,
        textAlign: 'center',
      }}
    >
      <CheckCircle2 size={32} color="var(--stage-attended)" />
      <div style={{ fontSize: 15, fontWeight: 600 }}>Sent to {sentCount} contacts</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 300 }}>
        Replies will land in your Chats inbox, handled by the AI agent.
      </div>
      <button
        onClick={onReset}
        style={{
          marginTop: 8,
          padding: '8px 16px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'transparent',
          fontSize: 13,
          cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        Send another
      </button>
    </div>
  )
}
