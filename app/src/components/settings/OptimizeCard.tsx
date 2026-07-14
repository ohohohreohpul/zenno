'use client'

import { useState } from 'react'
import { Sparkles, Check, Loader2, TrendingUp, TrendingDown, Wand2 } from 'lucide-react'

interface Proposal {
  summary: string
  wins: string[]
  losses: string[]
  proposedEdits: string
  currentPrompt: string
  proposedPrompt: string
}

type Phase = 'idle' | 'loading' | 'ready' | 'applying' | 'applied'

export function OptimizeCard() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runOptimize() {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/api/optimize?workspaceId=ws-1', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Optimization failed')
      setProposal(body.data)
      setPhase('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed')
      setPhase('idle')
    }
  }

  async function applyProposal() {
    if (!proposal) return
    setPhase('applying')
    try {
      const res = await fetch('/api/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'ws-1', systemPrompt: proposal.proposedPrompt }),
      })
      if (!res.ok) throw new Error('Apply failed')
      setPhase('applied')
      setTimeout(() => {
        setPhase('idle')
        setProposal(null)
      }, 2500)
    } catch {
      setError('Could not apply the proposed prompt.')
      setPhase('ready')
    }
  }

  if (phase === 'idle') {
    return (
      <div
        style={{
          background: 'var(--sidebar)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <Wand2 size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>One-click optimize</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.55, marginBottom: 14 }}>
          The AI reads your recent conversations — the ones that booked and the ones that stalled —
          and proposes concrete edits to this prompt to close more deals. You approve before anything changes.
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--stage-vip)', marginBottom: 10 }}>{error}</div>}
        <button
          onClick={runOptimize}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Sparkles size={14} />
          Analyze conversations
        </button>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div
        style={{
          background: 'var(--sidebar)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Loader2 size={20} className="animate-spin" color="var(--text-secondary)" />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Reading your conversations and finding what closes deals…
        </div>
      </div>
    )
  }

  if (phase === 'applied' || !proposal) {
    return phase === 'applied' ? (
      <div
        style={{
          background: 'var(--stage-attended)',
          color: 'white',
          borderRadius: 'var(--radius)',
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          fontSize: 13.5,
          fontWeight: 500,
        }}
      >
        <Check size={16} /> Optimized prompt applied. The agent is now smarter.
      </div>
    ) : null
  }

  return (
    <div
      style={{
        background: 'var(--sidebar)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Wand2 size={16} color="var(--text-secondary)" />
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Optimization proposal</span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>
        {proposal.summary}
      </div>

      {proposal.wins.length > 0 && (
        <Column icon={<TrendingUp size={13} color="var(--stage-attended)" />} title="What's winning deals">
          {proposal.wins.map((w, i) => (
            <Bullet key={i} color="var(--stage-attended)">{w}</Bullet>
          ))}
        </Column>
      )}

      {proposal.losses.length > 0 && (
        <Column icon={<TrendingDown size={13} color="var(--stage-vip)" />} title="What's losing deals">
          {proposal.losses.map((l, i) => (
            <Bullet key={i} color="var(--stage-vip)">{l}</Bullet>
          ))}
        </Column>
      )}

      {proposal.proposedEdits && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Proposed changes</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {proposal.proposedEdits}
          </div>
        </div>
      )}

      <details style={{ fontSize: 12 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--text-tertiary)', fontWeight: 500 }}>
          Review the proposed prompt
        </summary>
        <pre
          style={{
            marginTop: 8,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 12,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            maxHeight: 280,
            overflow: 'auto',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        >
          {proposal.proposedPrompt}
        </pre>
      </details>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={applyProposal}
          disabled={phase === 'applying'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--stage-attended)',
            color: 'white',
            fontSize: 13,
            fontWeight: 500,
            cursor: phase === 'applying' ? 'default' : 'pointer',
            opacity: phase === 'applying' ? 0.6 : 1,
          }}
        >
          {phase === 'applying' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {phase === 'applying' ? 'Applying…' : 'Apply optimized prompt'}
        </button>
        <button
          onClick={() => { setProposal(null); setPhase('idle') }}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Discard
        </button>
      </div>
    </div>
  )
}

function Column({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{children}</div>
    </div>
  )
}

function Bullet({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
      <span style={{ color, flexShrink: 0, marginTop: 1 }}>•</span>
      <span>{children}</span>
    </div>
  )
}
