'use client'

import { useEffect, useState } from 'react'
import { Plus, Zap, Play, Pause } from 'lucide-react'
import { FlowBuilder } from './FlowBuilder'
import { CommentToDmTab } from './CommentToDmTab'
import { BroadcastTab } from './BroadcastTab'

type CampaignTab = 'flows' | 'commentToDm' | 'broadcast'

const TAB_LABELS: Record<CampaignTab, string> = {
  flows: 'Flows',
  commentToDm: 'Comment-to-DM',
  broadcast: 'Broadcast',
}

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  trigger_stage: string | null
  flow: unknown[]
  created_at: string
}

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [activeTab, setActiveTab] = useState<CampaignTab>('flows')

  useEffect(() => {
    fetch('/api/campaigns?workspaceId=ws-1')
      .then((r) => r.json())
      .then((d) => setCampaigns(d.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (showBuilder || editing) {
    return (
      <FlowBuilder
        campaign={editing ?? undefined}
        onSave={(saved) => {
          setCampaigns((prev) =>
            editing
              ? prev.map((c) => (c.id === saved.id ? saved : c))
              : [saved, ...prev],
          )
          setEditing(null)
          setShowBuilder(false)
        }}
        onCancel={() => {
          setEditing(null)
          setShowBuilder(false)
        }}
      />
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>
          Campaigns
        </span>
        {activeTab === 'flows' && (
          <button
            onClick={() => setShowBuilder(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            New campaign
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
        }}
      >
        {(['flows', 'commentToDm', 'broadcast'] as const).map((tab) => {
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '14px 16px',
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {activeTab === 'commentToDm' ? (
          <CommentToDmTab />
        ) : activeTab === 'broadcast' ? (
          <BroadcastTab />
        ) : loading ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading…</div>
        ) : campaigns.length === 0 ? (
          <EmptyCampaigns onNew={() => setShowBuilder(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onEdit={() => setEditing(c)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CampaignCard({ campaign, onEdit }: { campaign: Campaign; onEdit: () => void }) {
  const [runState, setRunState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [sentCount, setSentCount] = useState(0)

  const statusColor: Record<Campaign['status'], string> = {
    draft: 'var(--text-tertiary)',
    active: 'var(--stage-attended)',
    paused: 'var(--stage-reviewed)',
    completed: 'var(--stage-qualified)',
  }

  async function handleRun(e: React.MouseEvent) {
    e.stopPropagation()
    if (runState === 'running') return
    setRunState('running')
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/run`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Run failed')
      setSentCount(body.data.enrolled)
      setRunState('done')
      setTimeout(() => setRunState('idle'), 4000)
    } catch {
      setRunState('error')
      setTimeout(() => setRunState('idle'), 3000)
    }
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer',
        transition: 'box-shadow var(--duration-fast)',
      }}
      onClick={onEdit}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Zap size={16} color="var(--text-secondary)" />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {campaign.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
          {campaign.flow.length} steps
          {campaign.trigger_stage && (
            <span> · triggers on <strong style={{ color: 'var(--text-secondary)' }}>{campaign.trigger_stage.replace('_', ' ')}</strong></span>
          )}
        </div>
      </div>

      <button
        onClick={handleRun}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 'var(--radius-sm)',
          border: runState === 'done' ? 'none' : '1px solid var(--border)',
          background: runState === 'done' ? 'var(--stage-attended)' : 'transparent',
          color: runState === 'done' ? 'white' : runState === 'error' ? 'var(--stage-vip)' : 'var(--text-secondary)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all var(--duration-fast)',
        }}
      >
        <Play size={12} />
        {runState === 'running' ? 'Sending…'
          : runState === 'done' ? `Sent to ${sentCount}`
          : runState === 'error' ? 'Failed'
          : 'Run now'}
      </button>

      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: statusColor[campaign.status],
          textTransform: 'capitalize',
          letterSpacing: '0.02em',
        }}
      >
        {campaign.status}
      </span>
    </div>
  )
}

function EmptyCampaigns({ onNew }: { onNew: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '80px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Zap size={24} color="var(--text-secondary)" />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          No campaigns yet
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 6, maxWidth: 280 }}>
          Build automated message sequences that fire when a contact reaches a lifecycle stage.
        </div>
      </div>
      <button
        onClick={onNew}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '9px 18px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          background: 'var(--accent)',
          color: 'var(--text-inverse)',
          fontSize: 13.5,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} />
        Create your first campaign
      </button>
    </div>
  )
}
